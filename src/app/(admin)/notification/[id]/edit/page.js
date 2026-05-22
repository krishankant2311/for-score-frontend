"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HiOutlineArrowLeft } from "react-icons/hi";
import { BiBell } from "react-icons/bi";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import { MOCK_NOTIFICATIONS } from "../../data";

export default function EditNotificationPage() {
  const router = useRouter();
  const params = useParams();
  const notificationId = parseInt(params.id);

  const [notification, setNotification] = useState(null);
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState("All Users");
  const [type, setType] = useState("General");
  const [status, setStatus] = useState("Draft");
  const [scheduledAt, setScheduledAt] = useState("");
  const [body, setBody] = useState("");

  const audienceOptions = ["All Users", "Active Subscribers", "Expired Subscribers"];
  const typeOptions = ["General", "Promotion", "System"];

  const chipClasses = (active) =>
    `flex-1 rounded-xl border text-sm font-medium py-2.5 px-4 text-center transition-all ${
      active
        ? "border-[#0A3161] bg-[#0A3161]/5 text-[#0A3161] shadow-sm"
        : "border-[#C8D7E9] bg-white text-[#2158A3] hover:bg-[#F2F5FA]"
    }`;

  // useEffect(() => {
  //   const found = MOCK_NOTIFICATIONS.find((n) => n.id === notificationId);
  //   if (!found) {
  //     toast.error("Notification not found");
  //     router.push("/notification");
  //     return;
  //   }
  //   setNotification(found);
  //   setTitle(found.title || "");
  //   setAudience(found.audience || "All Users");
  //   setType(found.type || "General");
  //   setStatus(found.status || "Draft");
  //   setScheduledAt(found.scheduledAt || "");
  //   setBody(found.body || "");
  // }, [notificationId, router]);
  useEffect(() => {
    const found = {
      id: notificationId,
      title: "Test Notification",
      audience: "All Users",
      type: "General",
      status: "Draft",
      scheduledAt: "",
      body: "<p>Sample body</p>",
    };
  
    setNotification(found);
    setTitle(found.title || "");
    setAudience(found.audience || "All Users");
    setType(found.type || "General");
    setStatus(found.status || "Draft");
    setScheduledAt(found.scheduledAt || "");
    setBody(found.body || "");
  }, [notificationId]);
  
  const handleSave = () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Please fill in title and body");
      return;
    }
    if (status === "Scheduled" && !scheduledAt.trim()) {
      toast.error("Please select scheduled date & time");
      return;
    }
    toast.success(`Notification "${title}" updated successfully!`);
    router.push("/notification");
  };

  if (!notification) {
    return (
      <div className="min-h-[80vh] py-8 px-1 flex items-center justify-center">
        <p className="text-[#2158A3]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] py-8 px-1">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#C8D7E9] bg-white text-[#0A3161] hover:bg-[#F2F5FA] transition-colors"
          aria-label="Back"
        >
          <HiOutlineArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0A3161] text-white shadow-md">
            <BiBell className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#0A3161] leading-6">
              Edit Notification
            </h1>
            <p className="text-sm text-[#2158A3]">Update notification details</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#C8D7E9] shadow-md p-6 md:p-7 mt-6 space-y-6">
        <div>
          <label className="text-sm font-medium text-[#0A3161]">
            Title <span className="text-red-500">*</span>
          </label>
          <Input
            className="mt-1.5 h-12 w-full rounded-lg border border-[#C8D7E9] bg-white px-4 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#0A3161]/30"
            placeholder="Enter notification title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-[#0A3161]">Audience</label>
            <div className="mt-2 grid gap-3 grid-cols-1 md:grid-cols-1">
              {audienceOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={chipClasses(audience === opt)}
                  onClick={() => setAudience(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-[#0A3161]">Type</label>
            <div className="mt-2 grid gap-3 grid-cols-3">
              {typeOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={chipClasses(type === opt)}
                  onClick={() => setType(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-[#0A3161]">Status</label>
          <div className="mt-2 grid gap-3 md:grid-cols-3">
            {["Draft", "Scheduled", "Sent"].map((opt) => (
              <button
                key={opt}
                type="button"
                className={chipClasses(status === opt)}
                onClick={() => setStatus(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {status === "Scheduled" && (
          <div>
            <label className="text-sm font-medium text-[#0A3161]">
              Scheduled Date &amp; Time <span className="text-red-500">*</span>
            </label>
            <Input
              type="datetime-local"
              className="mt-1.5 h-12 w-full rounded-lg border border-[#C8D7E9] bg-white px-4 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#0A3161]/30"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-[#0A3161]">
            Body <span className="text-red-500">*</span>
          </label>
          <div className="mt-2 border border-[#C8D7E9] rounded-lg overflow-hidden [&_.ck-editor__editable]:min-h-[260px] [&_.ck-editor__editable]:p-4 [&_.ck-toolbar]:border-t-0 [&_.ck-toolbar]:border-l-0 [&_.ck-toolbar]:border-r-0 [&_.ck-toolbar]:border-b [&_.ck-toolbar]:border-gray-200">
            <CKEditor
              editor={ClassicEditor}
              data={body}
              onChange={(event, editor) => setBody(editor.getData())}
              config={{
                placeholder: "Write the notification body...",
                toolbar: [
                  "heading",
                  "|",
                  "bold",
                  "italic",
                  "link",
                  "bulletedList",
                  "numberedList",
                  "|",
                  "blockQuote",
                  "insertTable",
                  "|",
                  "undo",
                  "redo",
                ],
              }}
            />
          </div>
        </div>

        <div className="mt-2 grid gap-4 md:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-center"
            onClick={() => router.push("/notification")}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="w-full justify-center bg-[#0A3161] hover:bg-[#0D3D7A]"
            onClick={handleSave}
          >
            Update Notification
          </Button>
        </div>
      </div>
    </div>
  );
}

