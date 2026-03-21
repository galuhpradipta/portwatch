import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import CompanyLogo from "./CompanyLogo.tsx";

describe("CompanyLogo", () => {
  it("renders initials immediately for missing logos", () => {
    const html = renderToStaticMarkup(
      <CompanyLogo
        name="Acme Labs"
        logoStatus="missing"
        logoSrc=""
        size={32}
      />,
    );

    expect(html).not.toContain("<img");
    expect(html).toContain("AL");
  });

  it("renders an eager image for ready priority logos", () => {
    const html = renderToStaticMarkup(
      <CompanyLogo
        name="Acme Labs"
        logoStatus="ready"
        logoSrc="/api/logos/acme"
        size={32}
        priority
      />,
    );

    expect(html).toContain("<img");
    expect(html).toContain('src="/api/logos/acme"');
    expect(html).toContain('loading="eager"');
  });
});
