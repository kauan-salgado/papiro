# db/ — SQL legivel

Esta pasta guarda o schema em **SQL puro**, escrito para ser lido por gente.

O banco de verdade e criado e versionado pelas **migrations do Prisma**
(`api/prisma/migrations/`). Os arquivos daqui nao rodam no boot da aplicacao:
existem porque o modelo de dados e a parte mais interessante deste projeto e
merece ser lido sem passar por `schema.prisma`.

| Arquivo | Conteudo |
| --- | --- |
| `schema.sql` | Tabelas, enum, constraints e indices (etapa 2) |
| `views.sql` | `vw_desempenho_disciplina` e `vw_desempenho_topico` (etapa 2) |

Regra de manutencao: se uma constraint mudar no `schema.prisma`, ela muda aqui
no mesmo commit. SQL desatualizado e pior do que SQL ausente.
