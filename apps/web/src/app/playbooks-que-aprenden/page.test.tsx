import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/app/playbooks-que-aprenden/page.tsx"), "utf8");

describe("learning playbooks page", () => {
  it("shows the four required methodology tabs", () => {
    expect(source).toContain("Señales detectadas");
    expect(source).toContain("Propuestas editables");
    expect(source).toContain("Publicados e historial");
    expect(source).toContain("Confianza y metodología");
  });

  it("renders explicit loading, error, empty, insufficient, stale and lifecycle states", () => {
    for (const value of ["Cargando", "No se pudo cargar", "Sin señales", "Evidencia insuficiente", "desactualizada", "draft", "approved", "rejected"]) {
      expect(source).toContain(value);
    }
  });

  it("supports human edit, approve, reject and rollback with mandatory reasons", () => {
    expect(source).toContain("Editar propuesta");
    expect(source).toContain("Aprobar y publicar");
    expect(source).toContain("Rechazar propuesta");
    expect(source).toContain("Restaurar como nueva versión");
    expect(source).toContain("Motivo obligatorio");
    expect(source).toContain("proposalHistory");
    expect(source).toContain("Evidencia congelada");
    expect(source).toContain("Decisión humana registrada");
    expect(source).not.toContain("proposal.actorId");
    expect(source).not.toContain("proposal.decisionById");
  });

  it("explains deterministic limits and excludes forbidden automation", () => {
    expect(source).toContain("No analiza transcripciones");
    expect(source).toContain("nunca demuestra causalidad");
    expect(source).toContain("no publica automáticamente");
    expect(source).not.toMatch(/scoring técnico|embeddings|generative ai/i);
  });
});
