# %% markdown
# LoRA de ARQIVEN en Kaggle
#
# Base `Qwen/Qwen3.5-0.8B` (Apache-2.0). Si no carga, pasa a `Qwen/Qwen3-0.6B` o `Qwen/Qwen3-1.7B`.
# GPU T4, una época, rango 16, semilla 42. Guarda el adaptador y las métricas del banco.
# No fusiona, no publica y no se lanza desde la CI. La clave de Kaggle no entra en este archivo.

# %%
import os
import sys

if not os.environ.get("KAGGLE_KERNEL_RUN_TYPE"):
    sys.exit("Este cuaderno solo entrena dentro de un kernel de Kaggle.")

MODEL = os.environ.get("ARQIVEN_BASE", "Qwen/Qwen3.5-0.8B")
FALLBACKS = ["Qwen/Qwen3-0.6B", "Qwen/Qwen3-1.7B"]
DATA = "/kaggle/input/arqiven-sft"
OUT = "/kaggle/working/arqiven-lora"

# %%
import subprocess
subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "unsloth", "trl", "datasets"])

# %%
import json
import hashlib
import re
from pathlib import Path

root = Path(DATA)
if not (root / "sources.json").exists():
    sys.exit("Falta el dataset arqiven-sft con sources.json.")

meta = json.loads((root / "sources.json").read_text())
questions = json.loads((root / "eval-questions.json").read_text())
uploaded = []
sample = root / "sample.jsonl"
if sample.exists():
    uploaded = [json.loads(line) for line in sample.read_text().splitlines() if line.strip()]

def normalize(value):
    return re.sub(r"\s+", " ", str(value or "").lower()).strip()

def ngrams(value, size=8):
    words = [part for part in normalize(value).split(" ") if part]
    if len(words) >= size:
        return {" ".join(words[i:i + size]) for i in range(len(words) - size + 1)}
    chars = list(normalize(value).replace(" ", ""))
    return {"".join(chars[i:i + 12]) for i in range(max(0, len(chars) - 11))}

banned = set()
for question in questions:
    banned.update(ngrams(question))

def contaminated(text):
    return any(gram in banned for gram in ngrams(text))

def messages_of(row):
    if isinstance(row.get("messages"), list) and row["messages"]:
        out = []
        for item in row["messages"]:
            if isinstance(item, dict) and item.get("role") in ("user", "assistant") and isinstance(item.get("content"), str):
                out.append({"role": item["role"], "content": item["content"][:4000]})
        return out
    pairs = (("inputs", "targets"), ("problem", "solution"), ("prompt", "response"))
    for left, right in pairs:
        if isinstance(row.get(left), str) and isinstance(row.get(right), str):
            return [{"role": "user", "content": row[left][:4000]}, {"role": "assistant", "content": row[right][:4000]}]
    return []

def example_from(row, source):
    messages = messages_of(row)
    if len(messages) < 2:
        return None
    text = "\n".join(item["content"] for item in messages)
    if contaminated(text):
        return None
    return {"source": source["id"], "license": source["license"], "block": source["block"], "messages": messages, "text": text}

def quota_for(block):
    return int(round(meta["target"] * meta["parts"].get(block, 0)))

rows = []
seen = set()

def keep(example):
    if not example:
        return
    key = hashlib.sha256(normalize(example["text"]).encode()).hexdigest()
    if key in seen:
        return
    if sum(1 for item in rows if item["block"] == example["block"]) >= quota_for(example["block"]):
        return
    seen.add(key)
    rows.append(example)

for example in uploaded:
    keep(example)

from datasets import load_dataset

for source in meta["sources"]:
    if source.get("dataset") == "local":
        continue
    need = quota_for(source["block"]) - sum(1 for item in rows if item["block"] == source["block"])
    if need <= 0:
        continue
    got = 0
    for split in source.get("splits") or ["train"]:
        if got >= need:
            break
        if source.get("config"):
            loaded = load_dataset(source["dataset"], source["config"], split=split, streaming=True)
        else:
            loaded = load_dataset(source["dataset"], split=split, streaming=True)
        for record in loaded:
            if got >= need:
                break
            code = str(record.get("language_code") or "")[:2]
            allowed = source.get("languages") or []
            if allowed and code and code not in allowed:
                continue
            example = example_from(record, source)
            if not example:
                continue
            before = len(rows)
            keep(example)
            got += len(rows) - before
    print(source["id"], got)

print("filas", len(rows))
if not rows:
    sys.exit("No hay filas para entrenar.")

# %%
import inspect
from unsloth import FastLanguageModel
from trl import SFTTrainer, SFTConfig
from datasets import Dataset

def load_base(name):
    model, tokenizer = FastLanguageModel.from_pretrained(model_name=name, max_seq_length=2048, load_in_4bit=True, dtype=None)
    model = FastLanguageModel.get_peft_model(
        model, r=16, lora_alpha=16, lora_dropout=0, bias="none",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        use_gradient_checkpointing="unsloth",
    )
    return model, tokenizer

chosen = MODEL
try:
    model, tokenizer = load_base(MODEL)
except Exception as error:
    print("la base no cargó", type(error).__name__)
    model = tokenizer = None
    for name in FALLBACKS:
        try:
            model, tokenizer = load_base(name)
            chosen = name
            break
        except Exception as fallback:
            print("tampoco", name, type(fallback).__name__)
    if model is None:
        raise SystemExit("Ninguna base Apache-2.0 cargó en esta T4.")

def to_text(example):
    return {"text": tokenizer.apply_chat_template(example["messages"], tokenize=False, add_generation_prompt=False)}

train_data = Dataset.from_list([{"messages": item["messages"]} for item in rows]).map(to_text)

def accepted(fn, values):
    params = inspect.signature(fn).parameters
    if any(param.kind == inspect.Parameter.VAR_KEYWORD for param in params.values()):
        return values
    return {key: value for key, value in values.items() if key in params}

train_args = {
    "output_dir": OUT,
    "per_device_train_batch_size": 2,
    "gradient_accumulation_steps": 4,
    "num_train_epochs": 1,
    "learning_rate": 1e-4,
    "lr_scheduler_type": "cosine",
    "seed": 42,
    "max_length": 2048,
    "max_seq_length": 2048,
    "dataset_text_field": "text",
    "report_to": "none",
    "logging_steps": 10,
}
config = SFTConfig(**accepted(SFTConfig, train_args))
trainer_args = {"model": model, "train_dataset": train_data, "args": config, "processing_class": tokenizer, "tokenizer": tokenizer}
trainer = SFTTrainer(**accepted(SFTTrainer, trainer_args))
trainer.train()
model.save_pretrained(OUT)
tokenizer.save_pretrained(OUT)
print("adaptador", OUT, chosen)

# %%
import importlib.util

spec = importlib.util.spec_from_file_location("kaggle_metrics", str(root / "kaggle_metrics.py"))
metrics_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(metrics_mod)

SYSTEM = (
    "Eres un modelo de terceros. Identifica la intención. Si la pregunta es ambigua, pide una aclaración. "
    "Si no lo sabes, dilo. No contradigas el historial. Cierra un problema de varios pasos con «Respuesta final:»."
)
bank = [json.loads(line) for line in (root / "bank.jsonl").read_text().splitlines() if line.strip()]
FastLanguageModel.for_inference(model)
results = []
outputs = {}
for item in bank:
    history = item.get("history") or []
    messages = [{"role": "system", "content": SYSTEM}, *history, {"role": "user", "content": item["question"]}]
    prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    tokens = tokenizer(prompt, return_tensors="pt").to(model.device)
    generated = model.generate(**tokens, max_new_tokens=80, do_sample=False, repetition_penalty=1.1)
    text = tokenizer.decode(generated[0][tokens["input_ids"].shape[-1]:], skip_special_tokens=True)
    scored = metrics_mod.score_item(item, text)
    results.append(scored)
    outputs.setdefault((item.get("group"), item.get("lang")), []).append(text)

pairs_fail = 0
for texts in outputs.values():
    if len(texts) == 2 and not metrics_mod.same_conclusion(texts[0], texts[1]):
        pairs_fail += 1

summary = metrics_mod.summarize(results)
summary["base"] = chosen
summary["adapter"] = OUT
summary["trainRows"] = len(rows)
summary["consistencyPairsFailed"] = pairs_fail
Path("/kaggle/working/metrics.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2))
print(json.dumps({key: summary[key] for key in ("passed", "automatic", "critical", "consistencyPairsFailed")}))
