# Roadmap — Módulo Inventário Patrimonial CCB Digital

- [x] ETAPA 1 — Analisar estrutura existente (igrejas, storage, envios, admin) e planejar tabelas e componentes
- [x] ETAPA 2 — Criar tabelas no banco de dados (migração aditiva + RLS + GRANTs) e hooks de persistência
- [x] ETAPA 3 — Criar Edge Function de extração de PDF/OCR (`parse-inventory-pdf`) e utilitários de agrupamento/classificação
- [x] ETAPA 4 — Criar navegação por abas (Documentos / Inventário) na tela inicial e tela inicial do Inventário
- [x] ETAPA 5 — Implementar importação de PDF, revisão/edição de dados extraídos e agrupamento automático
- [x] ETAPA 6 — Implementar conferência por quantidade, câmera (QR/código de barras) e busca manual, controle de etiquetas e bens extras
- [x] ETAPA 7 — Implementar gerador de relatórios PDF (7 tipos), integração de arquivamento na área Documentos e Dashboard Administrativa de Inventário
- [x] ETAPA 8 — Criar testes das regras de negócio, testar edge function e fluxos no navegador e verificar sistema original