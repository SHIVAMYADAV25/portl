import { render, screen, fireEvent } from "@testing-library/react-native";
import { router } from "expo-router";
import { useGenerateGuestPass } from "@/hooks/useVisitors";
import { useAuthStore } from "@/store/authStore";
import VisitorPreapprove from "../visitor-preapprove";

jest.mock("expo-router", () => ({ router: { back: jest.fn() } }));
jest.mock("@/hooks/useVisitors", () => ({ useGenerateGuestPass: jest.fn() }));
jest.mock("@/store/authStore", () => ({ useAuthStore: jest.fn() }));
jest.mock("react-native-qrcode-svg", () => {
  const { View } = require("react-native");
  return function MockQRCode(props: any) {
    return <View testID="mock-qrcode" {...props} />;
  };
});

function mockAuthUser(flatLabel = "A-1005") {
  (useAuthStore as unknown as jest.Mock).mockImplementation((selector: any) =>
    selector({ user: { flatLabel } })
  );
}

describe("VisitorPreapprove screen", () => {
  it("disables the generate button until a guest name is entered", async () => {
    mockAuthUser();
    (useGenerateGuestPass as jest.Mock).mockReturnValue({ mutate: jest.fn(), isPending: false });

    await render(<VisitorPreapprove />);
    const generateButton = screen.getByRole("button", { name: "Generate gate pass" });
    expect(generateButton.props.accessibilityState?.disabled).toBe(true);
  });

  it("generates a pass with the entered name, note, and selected duration", async () => {
    mockAuthUser("B-201");
    const mutate = jest.fn((_input, opts) => opts.onSuccess({ code: "PORTL-ABC123" }));
    (useGenerateGuestPass as jest.Mock).mockReturnValue({ mutate, isPending: false });

    await render(<VisitorPreapprove />);

    await fireEvent.changeText(screen.getByPlaceholderText("e.g. Ankit Verma"), "Ankit Verma");
    await fireEvent.press(screen.getByText("8h"));
    await fireEvent.changeText(
      screen.getByPlaceholderText("e.g. Arriving by cab, ask them to call on arrival"),
      "Arriving by cab"
    );
    await fireEvent.press(screen.getByText("Generate gate pass"));

    expect(mutate).toHaveBeenCalledWith(
      { guestName: "Ankit Verma", note: "Arriving by cab", validHours: 8, flatLabel: "B-201" },
      expect.any(Object)
    );

    // After a successful generation, the screen shows the QR pass instead of the form.
    expect(screen.getByTestId("mock-qrcode")).toBeTruthy();
    expect(screen.getByText("PORTL-ABC123")).toBeTruthy();
    expect(screen.getByText("Valid for the next 8 hours")).toBeTruthy();
  });

  it("does not call mutate when tapping generate with an empty name", async () => {
    mockAuthUser();
    const mutate = jest.fn();
    (useGenerateGuestPass as jest.Mock).mockReturnValue({ mutate, isPending: false });

    await render(<VisitorPreapprove />);
    await fireEvent.press(screen.getByText("Generate gate pass"));
    expect(mutate).not.toHaveBeenCalled();
  });

  it("tapping Done on the QR screen navigates back", async () => {
    mockAuthUser();
    const mutate = jest.fn((_input, opts) => opts.onSuccess({ code: "PORTL-XYZ789" }));
    (useGenerateGuestPass as jest.Mock).mockReturnValue({ mutate, isPending: false });

    await render(<VisitorPreapprove />);
    await fireEvent.changeText(screen.getByPlaceholderText("e.g. Ankit Verma"), "Test Guest");
    await fireEvent.press(screen.getByText("Generate gate pass"));

    await fireEvent.press(screen.getByText("Done"));
    expect(router.back).toHaveBeenCalled();
  });
});
