import { expect, test } from "@playwright/test";
import { checkSample, MAX_SAMPLES, takeSamples } from "../../src/lib/demo/portfolio";

// The work samples' limits (#355, #311): images and PDFs only, 10MB each, 12 on a profile. A file
// turned away is named with the reason, and the files that didn't fit are counted.

const file = (name: string, type: string, mb = 1) => ({ name, type, size: Math.round(mb * 1024 * 1024) });
const pngs = (n: number) => Array.from({ length: n }, (_, i) => file(`${i}.png`, "image/png"));

test.describe("portfolio samples · what a profile takes", () => {
  test("images and PDFs up to 10MB go on; any other kind, or anything bigger, is turned away by name", () => {
    for (const [name, type] of [["a.png", "image/png"], ["b.jpg", "image/jpeg"], ["c.webp", "image/webp"], ["d.gif", "image/gif"]]) expect(checkSample(file(name, type)), name).toBeNull();
    expect(checkSample(file("guide.pdf", "application/pdf", 10))).toBeNull();
    expect(checkSample(file("logo.svg", "image/svg+xml"))).toBe("logo.svg has to be an image (PNG, JPG, WebP or GIF) or a PDF.");
    expect(checkSample(file("deck.pdf", "application/pdf", 12.4))).toBe("deck.pdf is 12.4MB. The limit is 10MB.");
  });

  test("no more than 12 fit: the files left over are counted, ahead of one turned away", () => {
    expect(takeSamples(pngs(3), 9)).toEqual({ taken: pngs(3), problem: null });
    const over = takeSamples([...pngs(4), file("x.svg", "image/svg+xml")], 10);
    expect(over.taken).toHaveLength(2);
    expect(over.problem).toBe("A profile shows up to 12 work samples, so 2 files weren't added.");
    expect(takeSamples(pngs(1), MAX_SAMPLES)).toEqual({ taken: [], problem: "A profile shows up to 12 work samples, so 1 file wasn't added." });
    expect(takeSamples([file("x.svg", "image/svg+xml"), ...pngs(1)], 0)).toEqual({ taken: pngs(1), problem: "x.svg has to be an image (PNG, JPG, WebP or GIF) or a PDF." });
  });
});
