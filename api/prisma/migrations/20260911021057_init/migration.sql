-- CreateEnum
CREATE TYPE "tipo_estudo_enum" AS ENUM ('Teoria', 'Revisão', 'Resumo', 'Questões');

-- CreateTable
CREATE TABLE "concursos" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "banca" VARCHAR(80),
    "data_prova" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "concursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cargos" (
    "id" SERIAL NOT NULL,
    "concurso_id" INTEGER NOT NULL,
    "nome" VARCHAR(150) NOT NULL,

    CONSTRAINT "cargos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disciplinas" (
    "id" SERIAL NOT NULL,
    "cargo_id" INTEGER NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "peso" DECIMAL(4,2) DEFAULT 1,

    CONSTRAINT "disciplinas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topicos" (
    "id" SERIAL NOT NULL,
    "disciplina_id" INTEGER NOT NULL,
    "codigo_edital" VARCHAR(20),
    "descricao" TEXT NOT NULL,
    "ordem" INTEGER,

    CONSTRAINT "topicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulados" (
    "id" SERIAL NOT NULL,
    "cargo_id" INTEGER NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "data" DATE NOT NULL DEFAULT CURRENT_DATE,

    CONSTRAINT "simulados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessoes_estudo" (
    "id" SERIAL NOT NULL,
    "topico_id" INTEGER NOT NULL,
    "simulado_id" INTEGER,
    "data" DATE NOT NULL DEFAULT CURRENT_DATE,
    "tempo_minutos" INTEGER NOT NULL,
    "tipo_estudo" "tipo_estudo_enum" NOT NULL,
    "questoes_acertadas" INTEGER,
    "questoes_erradas" INTEGER,
    "questoes_brancas" INTEGER,
    "observacoes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessoes_estudo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "disciplinas_cargo_id_nome_key" ON "disciplinas"("cargo_id", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "topicos_disciplina_id_codigo_edital_key" ON "topicos"("disciplina_id", "codigo_edital");

-- CreateIndex
CREATE INDEX "idx_sessoes_topico" ON "sessoes_estudo"("topico_id");

-- CreateIndex
CREATE INDEX "idx_sessoes_data" ON "sessoes_estudo"("data");

-- AddForeignKey
ALTER TABLE "cargos" ADD CONSTRAINT "cargos_concurso_id_fkey" FOREIGN KEY ("concurso_id") REFERENCES "concursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disciplinas" ADD CONSTRAINT "disciplinas_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "cargos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topicos" ADD CONSTRAINT "topicos_disciplina_id_fkey" FOREIGN KEY ("disciplina_id") REFERENCES "disciplinas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulados" ADD CONSTRAINT "simulados_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "cargos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes_estudo" ADD CONSTRAINT "sessoes_estudo_topico_id_fkey" FOREIGN KEY ("topico_id") REFERENCES "topicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes_estudo" ADD CONSTRAINT "sessoes_estudo_simulado_id_fkey" FOREIGN KEY ("simulado_id") REFERENCES "simulados"("id") ON DELETE SET NULL ON UPDATE CASCADE;
