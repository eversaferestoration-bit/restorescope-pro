import { useNavigate } from "react-router-dom";

export default function Settings() {
  const navigate = useNavigate();

  const items = [
    {
      title: "Company Profile",
      description: "Configure company profile",
      action: () => navigate("/company"),
    },
    {
      title: "Notifications",
      description: "Configure notifications",
      action: () => navigate("/notifications"),
    },
    {
      title: "Security",
      description: "Configure security",
      action: () => navigate("/security"),
    },
    {
      title: "Integrations",
      description: "Configure integrations",
      action: () => navigate("/integrations"),
    },
    {
      title: "Getting started checklist",
      description: "Reopen the activation checklist on the dashboard",
      action: () => navigate("/onboarding"),
      label: "Reopen",
    },
  ];

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">Settings</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Manage your account and company settings
      </p>

      <div className="border rounded-xl divide-y">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-4 hover:bg-muted/50 transition"
          >
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground">
                {item.description}
              </p>
            </div>

            <button
              onClick={item.action}
              className="text-sm text-primary font-medium hover:underline"
            >
              {item.label || "Manage"}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 border border-destructive/30 rounded-xl p-4 bg-destructive/5">
        <p className="font-semibold text-destructive mb-1">Delete Account</p>
        <p className="text-sm text-muted-foreground mb-3">
          Permanently delete your account and all associated data.
        </p>

        <button
          onClick={() => alert("Delete flow not connected yet")}
          className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700"
        >
          Delete My Account
        </button>
      </div>
    </div>
  );
}