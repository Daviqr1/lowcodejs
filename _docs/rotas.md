# Guia de Telas e Rotas — LowCodeJS

Manual de uso das páginas da plataforma. Para cada tela: **o que é**, **para que serve**, **como chegar** (endereço/URL) e **quem acessa** (papel).

> Os endereços usam a barra do navegador. Onde aparece `{algo}` entre chaves, troque pelo valor real — por exemplo `/tables/{tabela}` vira `/tables/clientes`.

## Índice

1. [Papéis e acesso](#1-papéis-e-acesso)
2. [Primeiro acesso — Instalação (Setup)](#2-primeiro-acesso--instalação-setup)
3. [Entrar na conta (Autenticação)](#3-entrar-na-conta-autenticação)
4. [Painel (Dashboard)](#4-painel-dashboard)
5. [Tabelas](#5-tabelas)
6. [Usuários](#6-usuários)
7. [Grupos (perfis de permissão)](#7-grupos-perfis-de-permissão)
8. [Menus (navegação)](#8-menus-navegação)
9. [Páginas](#9-páginas)
10. [Perfil](#10-perfil)
11. [Configurações](#11-configurações)
12. [Extensões e Ferramentas](#12-extensões-e-ferramentas)
13. [Notificações](#13-notificações)
14. [Histórico / Logs](#14-histórico--logs)
15. [Tabela-resumo de todas as rotas](#15-tabela-resumo-de-todas-as-rotas)

---

## 1. Papéis e acesso

A plataforma tem 4 papéis, do mais para o menos poderoso. Cada papel enxerga um conjunto de telas.

| Papel | O que enxerga |
| --- | --- |
| **MASTER** | Tudo: painel, configurações do sistema, usuários, grupos, menus, extensões, tabelas. É o dono da instalação. |
| **ADMINISTRATOR** | Gestão de usuários, grupos, menus, extensões, logs e tabelas. Não acessa as configurações gerais do sistema. |
| **MANAGER** | Tabelas (que possui) e seus registros. |
| **REGISTERED** | Tabelas liberadas para ele (ver e criar registros), páginas e o próprio perfil. |

> Ao entrar, cada papel é levado automaticamente para a sua tela inicial padrão (geralmente a lista de **Tabelas**).
>
> Algumas tabelas podem ser **públicas** — nesse caso é possível abri-las e ver/criar registros mesmo sem login.

---

## 2. Primeiro acesso — Instalação (Setup)

O assistente de instalação só aparece **enquanto o sistema ainda não foi configurado**. É um passo a passo: não dá para pular etapas — se tentar acessar uma etapa adiante, o sistema devolve para a etapa atual. Depois de concluído, ele some e o endereço passa a redirecionar para o login.

| Passo | Endereço | O que faz |
| --- | --- | --- |
| 1. Administrador | `/setup/admin` | Cria a primeira conta MASTER (dono do sistema). |
| 2. Nome | `/setup/name` | Define nome e descrição do sistema. |
| 3. Logos | `/setup/logos` | Envia o logotipo (versão pequena e grande). |
| 4. E-mail | `/setup/email` | Configura o envio de e-mails (SMTP) — opcional. |
| 5. Armazenamento | `/setup/storage` | Escolhe onde os arquivos ficam: disco local ou S3. |
| 6. Paginação | `/setup/paging` | Quantidade de itens por página nas listas. |
| 7. Upload | `/setup/upload` | Limites de tamanho/tipo dos arquivos enviados. |

---

## 3. Entrar na conta (Autenticação)

Telas públicas de acesso. Quem já está logado é redirecionado direto para a tela inicial.

| Tela | Endereço | O que faz |
| --- | --- | --- |
| Login | `/` | Entrar com e-mail e senha. |
| Cadastro | `/sign-up` | Criar uma conta nova. |
| Esqueci a senha | `/forgot-password` | Pedir um código de recuperação por e-mail. |
| Validar código | `/forgot-password/validate-code` | Informar o código de 6 dígitos recebido. |
| Nova senha | `/forgot-password/reset-password` | Definir a nova senha após validar o código. |

> Recuperação de senha segue a ordem: pedir código → validar código → nova senha.

---

## 4. Painel (Dashboard)

**O que é:** visão geral do sistema com cartões de estatísticas e gráficos (tabelas, usuários) e atividade recente.

- **Como chegar:** `/dashboard`
- **Quem acessa:** MASTER

---

## 5. Tabelas

O coração da plataforma. Tabelas são as estruturas de dados que você cria sem programar — cada uma tem campos, registros e modos de visualização.

### 5.1. Lista de tabelas

**O que é:** lista de todas as tabelas, com busca, filtros (visibilidade, dono) e lixeira.

- **Como chegar:** `/tables`
- **Ações:** buscar, filtrar, abrir uma tabela, criar nova, ver/restaurar itens da lixeira.

### 5.2. Criar tabela

Ao criar, você escolhe entre três caminhos:

| Forma | Endereço | O que faz |
| --- | --- | --- |
| Escolher como criar | `/tables/new` | Tela inicial com as 3 opções abaixo. |
| Do zero | `/tables/create` | Cria uma tabela nova definindo nome, logo, estilo de exibição e visibilidade. |
| Clonar modelo | `/tables/clone` | Cria a partir de uma tabela existente usada como modelo. |
| Importar (YAML) | `/tables/schema-import` | Cria várias tabelas de uma vez a partir de um arquivo de definição. |

### 5.3. Abrir uma tabela e visualizar dados

**O que é:** abre a tabela e mostra seus registros. A mesma tabela pode ser exibida em diferentes **modos de visualização**:

- **Como chegar:** `/tables/{tabela}`
- **Modos de visualização:** Lista, Galeria, Documento, Card, Mosaico, Kanban, Fórum, Calendário, Gantt.
- **Ações:** paginar, filtrar, importar CSV, ver a lixeira da tabela, abrir registros.

### 5.4. Configurar a tabela

**O que é:** edita as definições da tabela: nome, estilo de exibição, visibilidade (pública/privada), colaboração e layout dos campos.

- **Como chegar:** `/tables/{tabela}/detail`

### 5.5. Campos

Os campos são as colunas da tabela. Suportam **grupos de campo** (um único nível de agrupamento).

| Tela | Endereço | O que faz |
| --- | --- | --- |
| Criar campo | `/tables/{tabela}/field/create` | Adiciona um campo novo (texto, número, relacionamento etc.). |
| Editar campo | `/tables/{tabela}/field/{campo}` | Altera as definições de um campo existente. |

### 5.6. Registros (linhas)

Os registros são as linhas de dados da tabela. A edição conta com **salvamento automático**.

| Tela | Endereço | O que faz |
| --- | --- | --- |
| Criar registro | `/tables/{tabela}/row/create` | Adiciona um registro novo. |
| Ver / editar registro | `/tables/{tabela}/row/{registro}` | Abre um registro para consultar ou editar (auto-save). |

### 5.7. Métodos / automações

**O que é:** editores de código que rodam em momentos específicos do ciclo do registro:

- **Como chegar:** `/tables/{tabela}/methods`
- **Gatilhos:** `onLoad` (ao carregar), `beforeSave` (antes de salvar), `afterSave` (depois de salvar).

---

## 6. Usuários

Gestão das contas de pessoas que acessam a plataforma.

| Tela | Endereço | O que faz |
| --- | --- | --- |
| Lista | `/users` | Lista usuários, com busca e lixeira. |
| Criar | `/users/create` | Cria um usuário novo. |
| Editar | `/users/{usuario}` | Altera nome, e-mail, senha, status e grupo. |

- **Quem acessa:** MASTER, ADMINISTRATOR

---

## 7. Grupos (perfis de permissão)

Grupos definem o que cada conjunto de usuários pode fazer. Os grupos de sistema (MASTER, ADMIN, MANAGER, REGISTERED) são protegidos.

| Tela | Endereço | O que faz |
| --- | --- | --- |
| Lista | `/groups` | Lista grupos, com busca e lixeira. |
| Criar | `/groups/create` | Cria um grupo novo. |
| Editar | `/groups/{grupo}` | Altera nome, descrição e permissões. |

- **Quem acessa:** MASTER, ADMINISTRATOR

---

## 8. Menus (navegação)

Controla os itens que aparecem no menu de navegação. Os itens podem ter hierarquia e ser reordenados.

| Tela | Endereço | O que faz |
| --- | --- | --- |
| Lista | `/menus` | Lista os itens de menu; permite reordenar. |
| Criar | `/menus/create` | Cria um item novo. |
| Editar | `/menus/{menu}` | Altera o item (campos variam conforme o tipo). |

**Tipos de item de menu:**

| Tipo | Aponta para |
| --- | --- |
| PAGE | Uma página de conteúdo (`/pages/{slug}`). |
| TABLE | Uma tabela (`/tables/{tabela}`). |
| FORM | A visão de formulário de uma tabela. |
| EXTERNAL | Um endereço externo (outro site). |
| SEPARATOR | Apenas um divisor visual (sem link). |

- **Quem acessa:** MASTER, ADMINISTRATOR

---

## 9. Páginas

**O que é:** exibe uma página de conteúdo HTML personalizado, normalmente ligada a um item de menu do tipo PAGE.

- **Como chegar:** `/pages/{slug}`
- **Quem acessa:** qualquer usuário autenticado.

---

## 10. Perfil

**O que é:** o usuário vê e edita os próprios dados (nome, e-mail, senha).

- **Como chegar:** `/profile`
- **Quem acessa:** qualquer usuário autenticado.

---

## 11. Configurações

**O que é:** configurações gerais do sistema — nome, descrição, idioma (locale), logos, e-mail (SMTP), armazenamento, paginação, Assistente de IA e limites de upload. Inclui também a migração de armazenamento.

- **Como chegar:** `/settings`
- **Quem acessa:** MASTER

---

## 12. Extensões e Ferramentas

Recursos que estendem a plataforma além do núcleo.

| Tela | Endereço | O que faz | Quem acessa |
| --- | --- | --- | --- |
| Ferramentas | `/tools` | Lista as ferramentas/extensões ativas. | Autenticados |
| Executar ferramenta | `/tools/{pacote}/{id}` | Abre e executa uma ferramenta específica. | Autenticados |
| Extensões (workshop) | `/extensions` | Gerencia extensões: ativar/desativar e configurar. | MASTER, ADMINISTRATOR |
| Executar extensão | `/e/{pacote}/{id}` | Roda uma extensão específica. | Autenticados |

---

## 13. Notificações

**O que é:** avisos e notificações do sistema para o usuário.

- **Como chegar:** `/notifications`
- **Quem acessa:** qualquer usuário autenticado.

---

## 14. Histórico / Logs

**O que é:** trilha de auditoria das ações realizadas no sistema (quem fez o quê e quando). Permite filtrar por ação, objeto e período, além de exportar.

- **Como chegar:** `/logs`
- **Quem acessa:** qualquer usuário autenticado.

---

## 15. Tabela-resumo de todas as rotas

| Endereço | Tela | Quem acessa |
| --- | --- | --- |
| `/setup/admin` … `/setup/upload` | Assistente de instalação (7 passos) | Antes de configurar |
| `/` | Login | Público |
| `/sign-up` | Cadastro | Público |
| `/forgot-password` | Esqueci a senha | Público |
| `/forgot-password/validate-code` | Validar código | Público |
| `/forgot-password/reset-password` | Nova senha | Público |
| `/dashboard` | Painel | MASTER |
| `/tables` | Lista de tabelas | Autenticados |
| `/tables/new` | Escolher como criar tabela | Autenticados |
| `/tables/create` | Criar tabela do zero | Autenticados |
| `/tables/clone` | Clonar tabela | Autenticados |
| `/tables/schema-import` | Importar tabelas (YAML) | Autenticados |
| `/tables/{tabela}` | Abrir tabela / visualizar dados | Autenticados / público se a tabela for pública |
| `/tables/{tabela}/detail` | Configurar tabela | Donos / admin |
| `/tables/{tabela}/methods` | Métodos / automações | Donos / admin |
| `/tables/{tabela}/field/create` | Criar campo | Donos / admin |
| `/tables/{tabela}/field/{campo}` | Editar campo | Donos / admin |
| `/tables/{tabela}/row/create` | Criar registro | Conforme permissão da tabela |
| `/tables/{tabela}/row/{registro}` | Ver / editar registro | Conforme permissão da tabela |
| `/users` | Lista de usuários | MASTER, ADMIN |
| `/users/create` | Criar usuário | MASTER, ADMIN |
| `/users/{usuario}` | Editar usuário | MASTER, ADMIN |
| `/groups` | Lista de grupos | MASTER, ADMIN |
| `/groups/create` | Criar grupo | MASTER, ADMIN |
| `/groups/{grupo}` | Editar grupo | MASTER, ADMIN |
| `/menus` | Lista de menus | MASTER, ADMIN |
| `/menus/create` | Criar menu | MASTER, ADMIN |
| `/menus/{menu}` | Editar menu | MASTER, ADMIN |
| `/pages/{slug}` | Página de conteúdo | Autenticados |
| `/profile` | Perfil | Autenticados |
| `/settings` | Configurações do sistema | MASTER |
| `/tools` | Ferramentas ativas | Autenticados |
| `/tools/{pacote}/{id}` | Executar ferramenta | Autenticados |
| `/extensions` | Workshop de extensões | MASTER, ADMIN |
| `/e/{pacote}/{id}` | Executar extensão | Autenticados |
| `/notifications` | Notificações | Autenticados |
| `/logs` | Histórico / logs | Autenticados |
