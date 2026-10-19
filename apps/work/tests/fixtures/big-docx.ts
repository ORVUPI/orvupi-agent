import { randomBytes } from "node:crypto";
import { open } from "node:fs/promises";

/**
 * DOCX sintético grande (30, 100, 250 MB…): muchas imágenes JPEG válidas. Cada imagen es una
 * JPEG pequeña real con segmentos de comentario (COM) de relleno aleatorio, así pesa lo que se
 * pida, no se comprime y el navegador la decodifica. Se escribe en disco por partes (zip sin
 * compresión), sin tener todo el archivo en memoria.
 */

const TINY_JPEG = Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCADIAUADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwCtRRRUn6cFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQBnavq/9leT+483zd38e3GMex9azf+Eu/wCnH/yL/wDWo8Xf8un/AAP/ANlrN0jSP7V879/5Xlbf4N2c59x6VtGMeW7PlcZjMd9elh8PLtZWXa71Zpf8Jd/04/8AkX/61H/CXf8ATj/5F/8ArUf8Ij/0/f8AkL/69H/CI/8AT9/5C/8Ar0fuw/4XP65A/wCEu/6cf/Iv/wBaj/hLv+nH/wAi/wD1qP8AhEf+n7/yF/8AXo/4RH/p+/8AIX/16P3Yf8Ln9cgf8Jd/04/+Rf8A61H/AAl3/Tj/AORf/rUf8Ij/ANP3/kL/AOvR/wAIj/0/f+Qv/r0fuw/4XP65A/4S7/px/wDIv/1qP+Eu/wCnH/yL/wDWo/4RH/p+/wDIX/16P+ER/wCn7/yF/wDXo/dh/wALn9cgf8Jd/wBOP/kX/wCtR/wl3/Tj/wCRf/rUf8Ij/wBP3/kL/wCvR/wiP/T9/wCQv/r0fuw/4XP65A/4S7/px/8AIv8A9aj/AIS7/px/8i//AFqP+ER/6fv/ACF/9ej/AIRH/p+/8hf/AF6P3Yf8Ln9cgf8ACXf9OP8A5F/+tR/wl3/Tj/5F/wDrUf8ACI/9P3/kL/69H/CI/wDT9/5C/wDr0fuw/wCFz+uQP+Eu/wCnH/yL/wDWo/4S7/px/wDIv/1qP+ER/wCn7/yF/wDXo/4RH/p+/wDIX/16P3Yf8Ln9cgf8Jd/04/8AkX/61H/CXf8ATj/5F/8ArUf8Ij/0/f8AkL/69H/CI/8AT9/5C/8Ar0fuw/4XP65A/wCEu/6cf/Iv/wBaj/hLv+nH/wAi/wD1qP8AhEf+n7/yF/8AXo/4RH/p+/8AIX/16P3Yf8Ln9cgf8Jd/04/+Rf8A61H/AAl3/Tj/AORf/rUf8Ij/ANP3/kL/AOvR/wAIj/0/f+Qv/r0fuw/4XP65A/4S7/px/wDIv/1qP+Eu/wCnH/yL/wDWo/4RH/p+/wDIX/16P+ER/wCn7/yF/wDXo/dh/wALn9cgf8Jd/wBOP/kX/wCtR/wl3/Tj/wCRf/rUf8Ij/wBP3/kL/wCvR/wiP/T9/wCQv/r0fuw/4XP65A/4S7/px/8AIv8A9aj/AIS7/px/8i//AFqP+ER/6fv/ACF/9ej/AIRH/p+/8hf/AF6P3Yf8Ln9cgf8ACXf9OP8A5F/+tR/wl3/Tj/5F/wDrUf8ACI/9P3/kL/69H/CI/wDT9/5C/wDr0fuw/wCFz+uQP+Eu/wCnH/yL/wDWo/4S7/px/wDIv/1qP+ER/wCn7/yF/wDXo/4RH/p+/wDIX/16P3Yf8Ln9cgf8Jd/04/8AkX/61XdK1z+07poPs3lbULZ357genvWLquh/2ZarP9p83c4XGzHYn19qk8K/8hOT/rif/QlocY8t0RQxuYQxkKGIlvurR/Q6yiiisT60KKKKAOc8Xf8ALp/wP/2Wjwj/AMvf/AP/AGajxd/y6f8AA/8A2Wjwj/y9/wDAP/Zq2/5dnyv/ADPP6/kOjooorE+qCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAMXxV/wAgyP8A67D/ANBas3wr/wAhOT/rif8A0Ja0vFX/ACDI/wDrsP8A0FqzfCv/ACE5P+uJ/wDQlrZfAfK4r/kcQ+R1lFFFYn1QUUUUAc54u/5dP+B/+y0eEf8Al7/4B/7NR4u/5dP+B/8AstHhH/l7/wCAf+zVt/y7Plf+Z5/X8h0dFFFYn1QUUUUAFFFFABRRRQAUUUUAFFFMmmjt4WmmcIiDJY0CbSV3sPqlfavZ2GVlk3Sf8805bt+XXvWDqviKW4ZobNjHCD/rBkO3+A/X+VYlaxp9z5rG59GDcMOr+b2+Xc6C48VylsW1siqCeZCSSO3Axj9aot4h1RmJFwFBOQojXA/MVm0VooRXQ+fqZljKju6j+Wn5Gj/wkGqf8/X/AJDX/CrkXiu5DEzW0TrjgISpz9TmsKinyx7ChmOLg7qo/m7/AJnbWWuWN62xZDG5OAkvBP07d+nWtCvOa1dM164sSscpM0GRkE5ZR0+X/D27VlKn2Pewef3ajiF81+qOxoqK2uoLyHzbeQSJnGR2P0qWsj6iMoySlF3TCiiigYUUUUAFFFFABRRRQAUUUUAYvir/AJBkf/XYf+gtWb4V/wCQnJ/1xP8A6EtaXir/AJBkf/XYf+gtWb4V/wCQnJ/1xP8A6EtbL4D5XFf8jiHyOsooorE+qCiiigDnPF3/AC6f8D/9lo8I/wDL3/wD/wBmo8Xf8un/AAP/ANlo8I/8vf8AwD/2atv+XZ8r/wAzz+v5Do6KKKxPqgooooAKKKKACiiigAooooARmVFLswVVGSScACuM1rVW1C5KRufsyH5BjGT6n/PT8a1vE+oNDClnExVpRucj+70x+P8AT3rl62px6nyOeY9yl9Wg9Fv/AJf11Ciiitj5gKKKKACiiigAooooAuaZqMmnXayKx8tiBIvXcP8AH0rt4Zo7iFZoXDo4yGFeeV0HhjUGWY2MjEqw3RA9j1I/Hr+HvWVSN1c+iyTHulUWHm/dlt5P/g/mdNRRRWB9mFFFFABRRRQAUUUUAFFFFAGL4q/5Bkf/AF2H/oLVm+Ff+QnJ/wBcT/6EtaXir/kGR/8AXYf+gtWb4V/5Ccn/AFxP/oS1svgPlcV/yOIfI6yiiisT6oKKKKAOc8Xf8un/AAP/ANlo8I/8vf8AwD/2ajxd/wAun/A//ZaPCP8Ay9/8A/8AZq2/5dnyv/M8/r+Q6OiiisT6oKKKKACiiigAooooAKKKp6vKsOk3LMCQYyvHqeB/OhakVZqnCU30VzjL+5N5fTXBJw7ErkYIHb9MVBRRXWfl85ucnKW7CiiimSFFFFABRRRQAUUUUAFOjkeGVJYzh0YMp9CKbRQCbTuj0OCVZ4I5lBCyKGAPXBGafWV4blWTR0UA5iZlOfXOf61q1yNWdj9Ow1X21GFTukwooopG4UUUUAFFFFABRRRQBi+Kv+QZH/12H/oLVm+Ff+QnJ/1xP/oS1peKv+QZH/12H/oLVm+Ff+QnJ/1xP/oS1svgPlcV/wAjiHyOsooorE+qCiiigDnPF3/Lp/wP/wBlo8I/8vf/AAD/ANmo8Xf8un/A/wD2Wjwj/wAvf/AP/Zq2/wCXZ8r/AMzz+v5Do6KKKxPqgooooAKKKKACiiigArO8Qf8AIEuP+A/+hCtGqWsw+fpFym7bhN2cZ+7z/SnHdHNjIuWGqJdYv8jhqKKK6z8zCiiigAooooAKKKKACiiigAooooA6zwr/AMgyT/rsf/QVrarJ8NQ+XpCvuz5rs2MdO39K1q5Z/Ez9Hy2Ljg6afYKKKKk7gooooAKKKKACiiigDF8Vf8gyP/rsP/QWrN8K/wDITk/64n/0Ja0vFX/IMj/67D/0FqzfCv8AyE5P+uJ/9CWtl8B8riv+RxD5HWUUUVifVBRRRQBzni7/AJdP+B/+y0eEf+Xv/gH/ALNR4u/5dP8Agf8A7LR4R/5e/wDgH/s1bf8ALs+V/wCZ5/X8h0dFFFYn1QUUUUAFFFFABRRRQAUjKrqUZQysMEEZBFLRQG559d27Wt3LbtnMbFckYyOxx79airo/FNh9y+jX/YkwPyP9M/Sucrqi7q5+bY7DPDYiVPp09OgUUUVRxhRRRQAUUUUAFFFFABSqrOwRVLMxwABkk0lbXhqw+0XhupFzHB93I4Lf/W6/lUt2VzowuHliK0aUep09pbra2kVuuMRqFyBjJ7nHv1qWiiuU/TIxUYqK2QUUUUDCiiigAooooAKKKKAMXxV/yDI/+uw/9Bas3wr/AMhOT/rif/QlrS8Vf8gyP/rsP/QWrN8K/wDITk/64n/0Ja2XwHyuK/5HEPkdZRRRWJ9UFFFFAHOeLv8Al0/4H/7LR4R/5e/+Af8As1Hi7/l0/wCB/wDstHhH/l7/AOAf+zVt/wAuz5X/AJnn9fyHR0UUVifVBRRRQAUUUUAFFFFABRRRQA2SNJonikGUdSrD1BriNV059NvDH8xibmNyPvD/ABH+etdzUN3aQ31u0E65U9COqn1HvVQlys8vMsvWMp6aSWz/AEPP6K0tV0WfT2aRQZLbPD9xnsf8en8qza6U09j4OtQqUJuFRWYUUUUzIKKKKACiirunaVc6k/7tdsQbDyHov+J/+tSbsaUqU6s1CCu2Q2NnJfXaQRg/MfmYDO0dzXdWttHZ2yW8QOxBgZOSaisNOt9OhMcCn5jlmblm+tWq55z5j7rK8tWDhzT1m/w8goooqD1wooooAKKKKACiiigAooooAxfFX/IMj/67D/0FqzfCv/ITk/64n/0Ja0vFX/IMj/67D/0FqzfCv/ITk/64n/0Ja2XwHyuK/wCRxD5HWUUUVifVBRRRQBzni7/l0/4H/wCy0eEf+Xv/AIB/7NR4u/5dP+B/+y0eEf8Al7/4B/7NW3/Ls+V/5nn9fyHR0UUVifVBRRRQAUUUUAFFFFABRRRQAUUUUAFZN94ds7rLRD7NJ6oPlPT+H/DFa1FNNrYxr4elXjy1Y3RyFx4Z1CJsRBJ1JOCrAED3B/8Ar1SbTL9GKmynyDg4jJH5iu8oq1UZ4tTh/Dyd4Sa/E4L+zr7/AJ8rj/v03+FXIvDepSMQ8aRDGdzuMfpmuxoo9qxQ4ew6d5Sb+5GNZeGbW3bfO5uGB4BG1fy7/wAvathVVFCKoVVGAAMACloqG29z2aGFo4ePLSjYKKKKR0BRRRQAUUUUAFFFFABRRRQAUUUUAYvir/kGR/8AXYf+gtWb4V/5Ccn/AFxP/oS1peKv+QZH/wBdh/6C1ZvhX/kJyf8AXE/+hLWy+A+VxX/I4h8jrKKKKxPqgooooA5zxd/y6f8AA/8A2Wjwj/y9/wDAP/ZqPF3/AC6f8D/9lqloeqwaZ5/npI3mbcbAD0z6n3rZK9M+Rq1YUs6c5uyX/wAgdhRWL/wlVj/zyuP++V/xo/4Sqx/55XH/AHyv+NZ8kux739p4P/n4jaorF/4Sqx/55XH/AHyv+NH/AAlVj/zyuP8Avlf8aOSXYP7Twf8Az8RtUVi/8JVY/wDPK4/75X/Gj/hKrH/nlcf98r/jRyS7B/aeD/5+I2qKxf8AhKrH/nlcf98r/jR/wlVj/wA8rj/vlf8AGjkl2D+08H/z8RtUVi/8JVY/88rj/vlf8aP+Eqsf+eVx/wB8r/jRyS7B/aeD/wCfiNqisX/hKrH/AJ5XH/fK/wCNH/CVWP8AzyuP++V/xo5Jdg/tPB/8/EbVFYv/AAlVj/zyuP8Avlf8aP8AhKrH/nlcf98r/jRyS7B/aeD/AOfiNqisX/hKrH/nlcf98r/jR/wlVj/zyuP++V/xo5Jdg/tPB/8APxG1RWL/AMJVY/8APK4/75X/ABo/4Sqx/wCeVx/3yv8AjRyS7B/aeD/5+I2qKxf+Eqsf+eVx/wB8r/jR/wAJVY/88rj/AL5X/Gjkl2D+08H/AM/EbVFYv/CVWP8AzyuP++V/xo/4Sqx/55XH/fK/40ckuwf2ng/+fiNqisX/AISqx/55XH/fK/40f8JVY/8APK4/75X/ABo5Jdg/tPB/8/EbVFYv/CVWP/PK4/75X/Gj/hKrH/nlcf8AfK/40ckuwf2ng/8An4jaorF/4Sqx/wCeVx/3yv8AjR/wlVj/AM8rj/vlf8aOSXYP7Twf/PxG1RWL/wAJVY/88rj/AL5X/Gj/AISqx/55XH/fK/40ckuwf2ng/wDn4jaorF/4Sqx/55XH/fK/40f8JVY/88rj/vlf8aOSXYP7Twf/AD8QeKv+QZH/ANdh/wCgtWb4V/5Ccn/XE/8AoS0uta1balZpDCkqssgYlwAMYI7H3pPCv/ITk/64n/0Ja0SahqeBUrU62bQnTd1odZRRRWJ9eFFFFAGTrmlT6n5HkPGvl7s7yR1x6D2rJ/4RW+/562//AH03+FdZRVKbSseXiMpw2IqOrNO78/kcn/wit9/z1t/++m/wo/4RW+/562//AH03+FdZRT9pIx/sLB9n95yf/CK33/PW3/76b/Cj/hFb7/nrb/8AfTf4V1lFHtJB/YWD7P7zk/8AhFb7/nrb/wDfTf4Uf8Irff8APW3/AO+m/wAK6yij2kg/sLB9n95yf/CK33/PW3/76b/Cj/hFb7/nrb/99N/hXWUUe0kH9hYPs/vOT/4RW+/562//AH03+FH/AAit9/z1t/8Avpv8K6yij2kg/sLB9n95yf8Awit9/wA9bf8A76b/AAo/4RW+/wCetv8A99N/hXWUUe0kH9hYPs/vOT/4RW+/562//fTf4Uf8Irff89bf/vpv8K6yij2kg/sLB9n95yf/AAit9/z1t/8Avpv8KP8AhFb7/nrb/wDfTf4V1lFHtJB/YWD7P7zk/wDhFb7/AJ62/wD303+FH/CK33/PW3/76b/Cusoo9pIP7CwfZ/ecn/wit9/z1t/++m/wo/4RW+/562//AH03+FdZRR7SQf2Fg+z+85P/AIRW+/562/8A303+FH/CK33/AD1t/wDvpv8ACusoo9pIP7CwfZ/ecn/wit9/z1t/++m/wo/4RW+/562//fTf4V1lFHtJB/YWD7P7zk/+EVvv+etv/wB9N/hR/wAIrff89bf/AL6b/Cusoo9pIP7CwfZ/ecn/AMIrff8APW3/AO+m/wAKP+EVvv8Anrb/APfTf4V1lFHtJB/YWD7P7zk/+EVvv+etv/303+FH/CK33/PW3/76b/Cusoo9pIP7CwfZ/ecn/wAIrff89bf/AL6b/Cj/AIRW+/562/8A303+FdZRR7SQf2Fg+z+85P8A4RW+/wCetv8A99N/hWjoui3Om3jzTPEytGVAQknOQe49q26KHNtWNaOUYWjUVSCd15hRRRUHqhRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAf//Z", "base64");

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) crc = CRC_TABLE[(crc ^ data[i]!) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** JPEG válida de unos `size` bytes: SOI + segmentos COM aleatorios + resto de la JPEG pequeña. */
export function paddedJpeg(size: number): Buffer {
  const parts: Buffer[] = [TINY_JPEG.subarray(0, 2)];
  let total = TINY_JPEG.length;
  while (total < size) {
    const chunk = Math.min(65_000, size - total);
    const head = Buffer.from([0xff, 0xfe, ((chunk + 2) >> 8) & 0xff, (chunk + 2) & 0xff]);
    parts.push(head, randomBytes(chunk));
    total += chunk + 4;
  }
  parts.push(TINY_JPEG.subarray(2));
  return Buffer.concat(parts);
}

const esc = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;");

export async function writeBigDocx(path: string, targetBytes: number, imageBytes = 1_500_000): Promise<{ images: number; bytes: number }> {
  const count = Math.max(1, Math.round(targetBytes / imageBytes));
  // Cada imagen es distinta (relleno aleatorio propio): nada se deduplica al exportar.
  const distinct = Array.from({ length: count }, () => paddedJpeg(imageBytes));
  const entries: Array<{ name: string; data: Buffer }> = [];
  const rels: string[] = [];
  const body: string[] = ['<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>Documento grande ORVUPI</w:t></w:r></w:p>'];
  for (let i = 1; i <= count; i += 1) {
    rels.push(`<Relationship Id="rIdImg${i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image${i}.jpeg"/>`);
    body.push(`<w:p><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">Figura ${i}. </w:t></w:r><w:r><w:t>${esc("Texto de la actividad sobre enfermedades profesionales y prevención de riesgos laborales. ".repeat(3))}</w:t></w:r></w:p>`);
    body.push(`<w:p><w:r><w:drawing><wp:inline><wp:extent cx="3810000" cy="2381250"/><wp:docPr id="${i}" name="Imagen ${i}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${i}" name="image${i}.jpeg"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg${i}"/></pic:blipFill><pic:spPr/></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`);
  }
  const ns = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
  entries.push({ name: "[Content_Types].xml", data: Buffer.from('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>') });
  entries.push({ name: "_rels/.rels", data: Buffer.from('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>') });
  entries.push({ name: "word/_rels/document.xml.rels", data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join("")}</Relationships>`) });
  entries.push({ name: "word/document.xml", data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${ns}><w:body>${body.join("")}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`) });
  for (let i = 1; i <= count; i += 1) entries.push({ name: `word/media/image${i}.jpeg`, data: distinct[(i - 1) % distinct.length]! });

  const file = await open(path, "w");
  const central: Buffer[] = [];
  let offset = 0;
  const crcs = new Map<Buffer, number>();
  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    let crc = crcs.get(entry.data);
    if (crc === undefined) {
      crc = crc32(entry.data);
      crcs.set(entry.data, crc);
    }
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(entry.data.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    await file.write(local);
    await file.write(name);
    await file.write(entry.data);
    const head = Buffer.alloc(46);
    head.writeUInt32LE(0x02014b50, 0);
    head.writeUInt16LE(20, 4);
    head.writeUInt16LE(20, 6);
    head.writeUInt32LE(crc, 16);
    head.writeUInt32LE(entry.data.length, 20);
    head.writeUInt32LE(entry.data.length, 24);
    head.writeUInt16LE(name.length, 28);
    head.writeUInt32LE(offset, 42);
    central.push(head, name);
    offset += 30 + name.length + entry.data.length;
  }
  const dir = Buffer.concat(central);
  await file.write(dir);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(dir.length, 12);
  end.writeUInt32LE(offset, 16);
  await file.write(end);
  await file.close();
  return { images: count, bytes: offset + dir.length + 22 };
}
