import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RoleVisibleAction } from "./RoleVisibleAction";

describe("RoleVisibleAction", () => {
  const action = React.createElement("button", null, "Start inspection");

  it("renders the inspection action only for drivers", () => {
    const driverMarkup = renderToStaticMarkup(
      React.createElement(RoleVisibleAction, { role: "driver", view: "inspection" }, action),
    );
    const supervisorMarkup = renderToStaticMarkup(
      React.createElement(RoleVisibleAction, { role: "supervisor", view: "inspection" }, action),
    );
    const adminMarkup = renderToStaticMarkup(
      React.createElement(RoleVisibleAction, { role: "admin", view: "inspection" }, action),
    );

    expect(driverMarkup).toContain("Start inspection");
    expect(supervisorMarkup).not.toContain("Start inspection");
    expect(adminMarkup).not.toContain("Start inspection");
  });

  it("renders nothing for an unauthenticated role", () => {
    expect(
      renderToStaticMarkup(
        React.createElement(RoleVisibleAction, { role: null, view: "fleet" }, action),
      ),
    ).toBe("");
  });
});
