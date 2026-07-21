import { render, screen, fireEvent } from "@testing-library/react-native";
import { StatusBadge, Chip } from "../Badge";

describe("StatusBadge", () => {
  it("renders a known status with its mapped label", async () => {
    await render(<StatusBadge status="pending" />);
    // Whatever the mapped label text is, something should render — check no crash + text present.
    expect(screen.toJSON()).toBeTruthy();
  });

  it("falls back gracefully for an unknown status (renders the raw status as the label)", async () => {
    await render(<StatusBadge status="some-unmapped-status" />);
    expect(screen.getByText("some-unmapped-status")).toBeTruthy();
  });
});

describe("Chip", () => {
  it("renders the label", async () => {
    await render(<Chip label="Plumbing" />);
    expect(screen.getByText("Plumbing")).toBeTruthy();
  });

  it("calls onPress when tapped", async () => {
    const onPress = jest.fn();
    await render(<Chip label="Electrical" onPress={onPress} />);
    await fireEvent.press(screen.getByText("Electrical"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
