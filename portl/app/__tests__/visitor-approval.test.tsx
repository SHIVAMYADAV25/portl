import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useVisitors, useVisitorAction } from "@/hooks/useVisitors";
import VisitorApproval from "../visitor-approval";

jest.mock("expo-router", () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

jest.mock("@/hooks/useVisitors", () => ({
  useVisitors: jest.fn(),
  useVisitorAction: jest.fn(),
}));

const mockVisitor = {
  id: "visitor-1",
  name: "Amazon Delivery",
  category: "delivery" as const,
  company: "Amazon",
  purpose: "Package drop-off",
  flatLabel: "A-1005",
  status: "pending" as const,
  requestedAt: new Date().toISOString(),
};

function mockUseVisitors(visitors: any[]) {
  (useVisitors as jest.Mock).mockReturnValue({ data: visitors });
}

function mockUseVisitorAction() {
  const mutate = jest.fn();
  (useVisitorAction as jest.Mock).mockReturnValue({ mutate });
  return mutate;
}

beforeEach(() => {
  jest.useFakeTimers();
  (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "visitor-1" });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("VisitorApproval screen", () => {
  it("shows the waiting visitor's details", async () => {
    mockUseVisitors([mockVisitor]);
    mockUseVisitorAction();

    await render(<VisitorApproval />);

    expect(screen.getByText("Amazon Delivery")).toBeTruthy();
    expect(screen.getByText("Amazon")).toBeTruthy();
    expect(screen.getByText("Package drop-off")).toBeTruthy();
    expect(screen.getByText("For A-1005")).toBeTruthy();
    expect(screen.getByText("Delivery is waiting at the gate")).toBeTruthy();
  });

  it("shows a 'no visitor found' state when the visitor list is empty and no id matches", async () => {
    mockUseVisitors([]);
    mockUseVisitorAction();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "does-not-exist" });

    await render(<VisitorApproval />);
    expect(screen.getByText("No visitor found")).toBeTruthy();
  });

  it("approving calls visitorAction.mutate with the approve action, then navigates back", async () => {
    mockUseVisitors([mockVisitor]);
    const mutate = mockUseVisitorAction();

    await render(<VisitorApproval />);
    await fireEvent.press(screen.getByText("Approve"));

    expect(mutate).toHaveBeenCalledWith({ id: "visitor-1", action: "approve" });
    expect(screen.getByText("Approved")).toBeTruthy();

    jest.advanceTimersByTime(1000);
    await waitFor(() => expect(router.back).toHaveBeenCalled());
  });

  it("denying calls visitorAction.mutate with the reject action", async () => {
    mockUseVisitors([mockVisitor]);
    const mutate = mockUseVisitorAction();

    await render(<VisitorApproval />);
    await fireEvent.press(screen.getByText("Deny"));

    expect(mutate).toHaveBeenCalledWith({ id: "visitor-1", action: "reject" });
    expect(screen.getByText("Denied")).toBeTruthy();
  });

  it("'Leave at gate' shows a local resolution without calling the mutation (no approve/reject action exists for it)", async () => {
    mockUseVisitors([mockVisitor]);
    const mutate = mockUseVisitorAction();

    await render(<VisitorApproval />);
    await fireEvent.press(screen.getByText("Leave at gate"));

    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getByText("Left at gate")).toBeTruthy();
  });

  it("falls back to the first visitor in the list if no id param matches", async () => {
    mockUseVisitors([mockVisitor]);
    mockUseVisitorAction();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "some-other-id" });

    await render(<VisitorApproval />);
    expect(screen.getByText("Amazon Delivery")).toBeTruthy();
  });

  it("exposes descriptive accessibility labels on the approve/deny/leave-at-gate actions for screen readers", async () => {
    mockUseVisitors([mockVisitor]);
    mockUseVisitorAction();

    await render(<VisitorApproval />);

    expect(screen.getByLabelText("Approve Amazon Delivery")).toBeTruthy();
    expect(screen.getByLabelText("Deny Amazon Delivery")).toBeTruthy();
    expect(screen.getByLabelText("Leave Amazon Delivery at the gate")).toBeTruthy();
  });
});
