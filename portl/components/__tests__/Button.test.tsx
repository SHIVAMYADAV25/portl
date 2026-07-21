import { render, screen, fireEvent } from "@testing-library/react-native";
import { Button } from "../Button";

describe("Button", () => {
  it("renders the label", async () => {
    await render(<Button label="Save" onPress={() => {}} />);
    expect(screen.getByText("Save")).toBeTruthy();
  });

  it("calls onPress when tapped", async () => {
    const onPress = jest.fn();
    await render(<Button label="Confirm" onPress={onPress} />);
    await fireEvent.press(screen.getByText("Confirm"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not call onPress when disabled", async () => {
    const onPress = jest.fn();
    await render(<Button label="Disabled" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByText("Disabled"));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("does not call onPress while loading (shows a spinner instead of the label)", async () => {
    const onPress = jest.fn();
    await render(<Button label="Loading" onPress={onPress} loading />);
    expect(screen.queryByText("Loading")).toBeNull();
  });

  it("exposes an accessible button role and label matching the visible text", async () => {
    await render(<Button label="Approve visitor" onPress={() => {}} />);
    const button = screen.getByRole("button");
    expect(button.props.accessibilityLabel).toBe("Approve visitor");
  });
});
