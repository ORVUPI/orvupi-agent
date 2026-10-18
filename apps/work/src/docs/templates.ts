import type { Locale } from "../i18n";
import type { MessageKey } from "../i18n";
import { bulletList, documentNode, heading, paragraph, type JsonNode } from "./model";

export type TemplateCategory = "personal" | "study" | "business" | "manage";

export type WorkTemplate = {
  id: string;
  category: TemplateCategory;
  titleKey: MessageKey;
  bodyKey: MessageKey;
  build: (locale: Locale) => JsonNode;
};

const copy = {
  es: {
    cv: [heading(1, "Nombre Apellido"), paragraph("Ciudad · correo@ejemplo.com"), heading(2, "Experiencia"), bulletList(["Puesto, organización, año"]), heading(2, "Formación"), paragraph("Título y centro."), heading(2, "Contacto"), paragraph("Teléfono y enlace profesional.")],
    letter: [heading(1, "Carta"), paragraph("Destinatario"), paragraph("Asunto"), paragraph("Cuerpo de la carta."), paragraph("Cierre")],
    notes: [heading(1, "Notas"), heading(2, "Hoy"), bulletList(["Primera nota", "Segunda nota"])],
    report: [heading(1, "Informe"), heading(2, "Resumen"), paragraph("Qué se ha revisado y cuál es la conclusión."), heading(2, "Hallazgos"), bulletList(["Hallazgo 1", "Hallazgo 2"]), heading(2, "Próximos pasos"), paragraph("Qué sigue.")],
    quote: [heading(1, "Presupuesto"), paragraph("Cliente"), heading(2, "Conceptos"), bulletList(["Concepto — importe"]), paragraph("Total")],
    invoice: [heading(1, "Factura"), paragraph("Número y fecha"), paragraph("Emisor y cliente"), heading(2, "Líneas"), bulletList(["Descripción — cantidad — importe"]), paragraph("Total")],
    inventory: [heading(1, "Inventario"), bulletList(["Artículo — unidades — ubicación"])],
    expenses: [heading(1, "Control de gastos"), bulletList(["Fecha — concepto — importe"])],
    business: [heading(1, "Plan de negocio"), heading(2, "Oferta"), paragraph("Qué se ofrece."), heading(2, "Clientes"), paragraph("A quién va dirigido."), heading(2, "Números"), paragraph("Ingresos y costes de partida.")],
    meeting: [heading(1, "Reunión"), heading(2, "Orden del día"), bulletList(["Tema 1"]), heading(2, "Acuerdos"), paragraph("Decisiones."), heading(2, "Tareas"), bulletList(["Responsable y fecha"])],
    checklist: [heading(1, "Checklist"), bulletList(["Pendiente", "Pendiente", "Pendiente"])],
  },
  en: {
    cv: [heading(1, "Full name"), paragraph("City · name@example.com"), heading(2, "Experience"), bulletList(["Role, organization, year"]), heading(2, "Education"), paragraph("Degree and school."), heading(2, "Contact"), paragraph("Phone and professional link.")],
    letter: [heading(1, "Letter"), paragraph("Recipient"), paragraph("Subject"), paragraph("Body of the letter."), paragraph("Closing")],
    notes: [heading(1, "Notes"), heading(2, "Today"), bulletList(["First note", "Second note"])],
    report: [heading(1, "Report"), heading(2, "Summary"), paragraph("What was reviewed and the conclusion."), heading(2, "Findings"), bulletList(["Finding 1", "Finding 2"]), heading(2, "Next steps"), paragraph("What follows.")],
    quote: [heading(1, "Quote"), paragraph("Client"), heading(2, "Items"), bulletList(["Item — amount"]), paragraph("Total")],
    invoice: [heading(1, "Invoice"), paragraph("Number and date"), paragraph("Issuer and client"), heading(2, "Lines"), bulletList(["Description — quantity — amount"]), paragraph("Total")],
    inventory: [heading(1, "Inventory"), bulletList(["Item — units — location"])],
    expenses: [heading(1, "Expense tracker"), bulletList(["Date — item — amount"])],
    business: [heading(1, "Business plan"), heading(2, "Offer"), paragraph("What is offered."), heading(2, "Customers"), paragraph("Who it is for."), heading(2, "Numbers"), paragraph("Starting revenue and costs.")],
    meeting: [heading(1, "Meeting"), heading(2, "Agenda"), bulletList(["Topic 1"]), heading(2, "Decisions"), paragraph("Decisions."), heading(2, "Tasks"), bulletList(["Owner and date"])],
    checklist: [heading(1, "Checklist"), bulletList(["Open", "Open", "Open"])],
  },
} as const;

function pack(locale: Locale, id: keyof typeof copy.es): JsonNode {
  return documentNode([...copy[locale][id]]);
}

export const templates: WorkTemplate[] = [
  { id: "cv", category: "personal", titleKey: "templateCv", bodyKey: "templateCvBody", build: (locale) => pack(locale, "cv") },
  { id: "letter", category: "personal", titleKey: "templateLetter", bodyKey: "templateLetterBody", build: (locale) => pack(locale, "letter") },
  { id: "notes", category: "personal", titleKey: "templateNotes", bodyKey: "templateNotesBody", build: (locale) => pack(locale, "notes") },
  { id: "report", category: "study", titleKey: "templateReport", bodyKey: "templateReportBody", build: (locale) => pack(locale, "report") },
  { id: "quote", category: "business", titleKey: "templateQuote", bodyKey: "templateQuoteBody", build: (locale) => pack(locale, "quote") },
  { id: "invoice", category: "business", titleKey: "templateInvoice", bodyKey: "templateInvoiceBody", build: (locale) => pack(locale, "invoice") },
  { id: "inventory", category: "business", titleKey: "templateInventory", bodyKey: "templateInventoryBody", build: (locale) => pack(locale, "inventory") },
  { id: "expenses", category: "business", titleKey: "templateExpenses", bodyKey: "templateExpensesBody", build: (locale) => pack(locale, "expenses") },
  { id: "business", category: "business", titleKey: "templateBusiness", bodyKey: "templateBusinessBody", build: (locale) => pack(locale, "business") },
  { id: "meeting", category: "manage", titleKey: "templateMeeting", bodyKey: "templateMeetingBody", build: (locale) => pack(locale, "meeting") },
  { id: "checklist", category: "manage", titleKey: "templateChecklist", bodyKey: "templateChecklistBody", build: (locale) => pack(locale, "checklist") },
];

export const templateCategories: Array<{ id: TemplateCategory; label: MessageKey }> = [
  { id: "personal", label: "catPersonal" },
  { id: "study", label: "catStudy" },
  { id: "business", label: "catBusiness" },
  { id: "manage", label: "catManage" },
];
