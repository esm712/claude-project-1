import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Home from "../page";

test("renders the app title", () => {
  render(<Home />);
  expect(screen.getByRole("heading", { level: 1, name: /커피 당번/ })).toBeInTheDocument();
});
