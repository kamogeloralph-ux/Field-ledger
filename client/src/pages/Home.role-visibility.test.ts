import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "./Home";

describe("Home inspection entry", () => {
  it("opens on the company access code gate before any inspection controls are shown", () => {
    const markup = renderToStaticMarkup(React.createElement(Home));
    expect(markup).toContain("Enter your company code.");
    expect(markup).toContain("Access code");
    expect(markup).not.toContain("Start inspections");
    expect(markup).not.toContain("Sign in");
  });
});
