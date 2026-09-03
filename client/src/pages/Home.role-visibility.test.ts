import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "./Home";

describe("Home inspection entry", () => {
  it("opens directly to the name and selfie capture step", () => {
    const markup = renderToStaticMarkup(React.createElement(Home));
    expect(markup).toContain("Start an inspection");
    expect(markup).toContain("Full names and surnames");
    expect(markup).toContain("Take selfie");
    expect(markup).not.toContain("Sign in");
  });
});
