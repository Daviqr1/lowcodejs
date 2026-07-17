# Pacote `apps`

Pacote oficial de extensões opcionais do LowCodeJS. Diferente do `pkg=core`
(shipado e auto-ativado), extensões em `apps` começam **desativadas** — o
MASTER ativa em `/extensions` quando quer usar.

## Estrutura

```
apps/
└── modules/
    ├── dashboard/                ← Painel administrativo com dados reais (MODULE)
    └── senhas/                   ← Cofre de senhas cifrado, canais privados (MODULE)
```

## Modules

| ID          | URL default          | Permissões | Descrição |
|-------------|----------------------|------------|-----------|
| `dashboard` | `/e/apps/dashboard`  | MASTER, ADMINISTRATOR | Estatísticas reais do sistema (totais, gráfico mensal, atividades recentes). Endpoint próprio `GET /e/apps/dashboard/stats` blindado por `ExtensionActiveMiddleware` |
| `senhas`    | `/e/apps/senhas`     | Qualquer autenticado | Cofre de senhas inspirado no passbolt, modelado no Forum: canais privados por padrão e segredos cifrados em repouso (AES-256-GCM). Models Mongoose dedicados (`password_channels`, `password_entries`), 8 rotas REST. Ver `modules/senhas/CLAUDE.md` |

## Convenção de pacote

`apps` reúne extensões oficiais de **uso opcional** que estendem o produto sem
serem essenciais (ex: dashboards, relatórios, integrações). Cada extensão tem
`permissions.view` declarado no manifest.
