
import { GoogleGenAI, Type } from "@google/genai";
import { Client } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateSampleClients = async (): Promise<Partial<Client>[]> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "Gere uma lista de 5 clientes fictícios brasileiros para um sistema de CRM. Inclua nome, email, telefone, empresa e uma nota curta sobre o perfil deles.",
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
            company: { type: Type.STRING },
            status: { type: Type.STRING, description: "Deve ser 'active', 'inactive' ou 'pending'" },
            notes: { type: Type.STRING }
          },
          required: ["name", "email", "phone", "company", "status", "notes"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return [];
  }
};

export const analyzeClientBase = async (clients: Client[]): Promise<string> => {
  if (clients.length === 0) return "Nenhum cliente para analisar.";
  
  const clientData = clients.map(c => ({ name: c.name, company: c.company, notes: c.notes }));
  const prompt = `Analise os seguintes perfis de clientes e forneça um resumo executivo estratégico de 3 parágrafos sobre as oportunidades de negócio: ${JSON.stringify(clientData)}`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt
  });

  return response.text || "Não foi possível gerar análise.";
};
