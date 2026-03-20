export interface Envio {
  id: string;
  igreja_id: number;
  igreja_nome: string;
  tipo_formulario: string;
  nome_responsavel: string;
  arquivo_nome: string;
  arquivo_url: string;
  data_envio: string;
  mes_referencia: string;
  protocolo: string;
}

export interface DocumentoAdmin {
  id: string;
  nome: string;
  categoria: string;
  arquivo_url: string;
  data_upload: string;
}

const ENVIOS_KEY = "ccb_envios";
const DOCS_KEY = "ccb_documentos";
const COUNTER_KEY = "ccb_counter";

function getEnvios(): Envio[] {
  try {
    return JSON.parse(localStorage.getItem(ENVIOS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveEnvios(envios: Envio[]) {
  localStorage.setItem(ENVIOS_KEY, JSON.stringify(envios));
}

function getCounter(): number {
  return parseInt(localStorage.getItem(COUNTER_KEY) || "0", 10);
}

function incrementCounter(): number {
  const next = getCounter() + 1;
  localStorage.setItem(COUNTER_KEY, String(next));
  return next;
}

export function gerarProtocolo(): string {
  const year = new Date().getFullYear();
  const num = incrementCounter();
  return `CCB-${year}-${String(num).padStart(4, "0")}`;
}

export function getMesReferencia(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function adicionarEnvio(envio: Omit<Envio, "id" | "protocolo" | "data_envio"> & { mes_referencia?: string }): Envio {
  const newEnvio: Envio = {
    ...envio,
    id: crypto.randomUUID(),
    protocolo: gerarProtocolo(),
    data_envio: new Date().toISOString(),
    mes_referencia: envio.mes_referencia || getMesReferencia(),
  };
  const envios = getEnvios();
  envios.push(newEnvio);
  saveEnvios(envios);
  return newEnvio;
}

export function listarEnvios(): Envio[] {
  return getEnvios();
}

export function getDocumentosAdmin(): DocumentoAdmin[] {
  try {
    return JSON.parse(localStorage.getItem(DOCS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function adicionarDocumentoAdmin(doc: Omit<DocumentoAdmin, "id" | "data_upload">): DocumentoAdmin {
  const newDoc: DocumentoAdmin = {
    ...doc,
    id: crypto.randomUUID(),
    data_upload: new Date().toISOString(),
  };
  const docs = getDocumentosAdmin();
  docs.push(newDoc);
  localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
  return newDoc;
}

export function removerDocumentoAdmin(id: string) {
  const docs = getDocumentosAdmin().filter((d) => d.id !== id);
  localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
}

export function removerEnvio(id: string) {
  const envios = getEnvios().filter((e) => e.id !== id);
  saveEnvios(envios);
}
