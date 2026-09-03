import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "./Home";

describe("Home inspection entry", () => {
  it("opens on the driver welcome screen with the inspection controls wired behind it", () => {
    const markup = renderToStaticMarkup(React.createElement(Home));
    expect(markup).toContain("Start your inspection.");
    expect(markup).toContain("Start inspections");
    expect(markup).not.toContain("Sign in");
  });
});
