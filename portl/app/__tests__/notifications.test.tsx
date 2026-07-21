import { render, screen, fireEvent } from "@testing-library/react-native";
import { router } from "expo-router";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/useNotifications";
import Notifications from "../notifications";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));

jest.mock("@/hooks/useNotifications", () => ({
  useNotifications: jest.fn(),
  useMarkNotificationRead: jest.fn(),
  useMarkAllNotificationsRead: jest.fn(),
}));

const mockNotifications = [
  {
    id: "n1",
    userId: "u1",
    type: "visitor" as const,
    title: "Amazon Delivery is waiting",
    body: "Package drop-off",
    meta: { visitorId: "v1" },
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "n2",
    userId: "u1",
    type: "notice" as const,
    title: "Water shutoff",
    body: "Tomorrow 10am-2pm",
    meta: null,
    read: true,
    createdAt: new Date().toISOString(),
  },
];

function setup(notifications = mockNotifications) {
  const markRead = jest.fn();
  const markAllRead = jest.fn();
  (useNotifications as jest.Mock).mockReturnValue({ data: notifications, isLoading: false });
  (useMarkNotificationRead as jest.Mock).mockReturnValue({ mutate: markRead, isPending: false });
  (useMarkAllNotificationsRead as jest.Mock).mockReturnValue({ mutate: markAllRead, isPending: false });
  return { markRead, markAllRead };
}

describe("Notifications screen", () => {
  it("renders every notification's title and body", async () => {
    setup();
    await render(<Notifications />);
    expect(screen.getByText("Amazon Delivery is waiting")).toBeTruthy();
    expect(screen.getByText("Water shutoff")).toBeTruthy();
  });

  it("shows a 'Mark all read' action only when there are unread notifications", async () => {
    setup();
    await render(<Notifications />);
    expect(screen.getByText("Mark all read")).toBeTruthy();
  });

  it("hides 'Mark all read' when everything is already read", async () => {
    setup(mockNotifications.map((n) => ({ ...n, read: true })));
    await render(<Notifications />);
    expect(screen.queryByText("Mark all read")).toBeNull();
  });

  it("tapping an unread notification marks it read and navigates for a visitor-type notification", async () => {
    const { markRead } = setup();
    await render(<Notifications />);

    await fireEvent.press(screen.getByText("Amazon Delivery is waiting"));

    expect(markRead).toHaveBeenCalledWith("n1");
    expect(router.push).toHaveBeenCalledWith({ pathname: "/visitor-approval", params: { id: "v1" } });
  });

  it("tapping an already-read notification does not call markRead again", async () => {
    const { markRead } = setup();
    await render(<Notifications />);

    await fireEvent.press(screen.getByText("Water shutoff"));

    expect(markRead).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith("/notices");
  });

  it("tapping 'Mark all read' calls the bulk mutation", async () => {
    const { markAllRead } = setup();
    await render(<Notifications />);

    await fireEvent.press(screen.getByText("Mark all read"));
    expect(markAllRead).toHaveBeenCalled();
  });

  it("shows an empty state with no notifications", async () => {
    setup([]);
    await render(<Notifications />);
    expect(screen.getByText("No notifications yet")).toBeTruthy();
  });
});
