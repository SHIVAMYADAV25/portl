import { render, screen, fireEvent } from "@testing-library/react-native";
import { useRegisterVisitor } from "@/hooks/useVisitors";
import { useFlats } from "@/hooks/useFlats";
import Register from "../register";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));

jest.mock("@/hooks/useVisitors", () => ({
  useRegisterVisitor: jest.fn(),
}));

jest.mock("@/hooks/useFlats", () => ({
  useFlats: jest.fn(),
}));

const mockFlats = [
  { id: "f1", towerId: "t1", number: "1005", label: "A-1005", ownerName: "Priya Menon" },
  { id: "f2", towerId: "t1", number: "302", label: "A-302", ownerName: "Ankit Rao" },
];

function setup(mutate = jest.fn()) {
  (useRegisterVisitor as jest.Mock).mockReturnValue({ mutate, isPending: false });
  (useFlats as jest.Mock).mockReturnValue({ data: mockFlats });
  return mutate;
}

describe("Guard register screen — flat search", () => {
  it("shows suggestions matching what's typed", async () => {
    setup();
    await render(<Register />);

    const flatInput = screen.getByPlaceholderText("Search flat — e.g. A-1005");
    await fireEvent(flatInput, "focus");
    await fireEvent.changeText(flatInput, "A-1");

    expect(screen.getByText("A-1005")).toBeTruthy();
    expect(screen.getByText("Priya Menon")).toBeTruthy();
  });

  it("shows a confirmation message when the typed flat exactly matches a real flat", async () => {
    setup();
    await render(<Register />);

    const flatInput = screen.getByPlaceholderText("Search flat — e.g. A-1005");
    await fireEvent.changeText(flatInput, "A-1005");

    expect(screen.getByText("Matches Priya Menon's flat")).toBeTruthy();
  });

  it("warns when the typed flat doesn't match any known flat", async () => {
    setup();
    await render(<Register />);

    const flatInput = screen.getByPlaceholderText("Search flat — e.g. A-1005");
    await fireEvent.changeText(flatInput, "Z-9999");

    expect(screen.getByText("No exact match — double-check the flat number before sending")).toBeTruthy();
  });

  it("tapping a suggestion fills the field with the exact flat label", async () => {
    setup();
    await render(<Register />);

    const flatInput = screen.getByPlaceholderText("Search flat — e.g. A-1005");
    await fireEvent(flatInput, "focus");
    await fireEvent.changeText(flatInput, "A-3");
    await fireEvent.press(screen.getByText("A-302"));

    expect(flatInput.props.value).toBe("A-302");
  });

  it("submits with the exact flat label typed", async () => {
    const mutate = setup();
    await render(<Register />);

    await fireEvent.changeText(screen.getByPlaceholderText("e.g. Rohit — Zomato"), "Test Visitor");
    await fireEvent.changeText(screen.getByPlaceholderText("Search flat — e.g. A-1005"), "A-1005");
    await fireEvent.press(screen.getByText("Send approval request"));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Test Visitor", flatLabel: "A-1005" }),
      expect.anything()
    );
  });
});
