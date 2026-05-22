"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { FaRegEdit, FaSave } from "react-icons/fa";
import { HiOutlineTrash } from "react-icons/hi";
import { MOCK_CONTENT_ITEMS } from "./data";
import axios from "axios";
import { createPortal } from "react-dom";
import AdminHeaderCard from "@/components/admin/AdminHeaderCard";

const RichTextEditor = dynamic(() => import("./RichTextEditor"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[360px] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-3">
        <div className="mx-auto h-5 w-40 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-10 w-full animate-pulse rounded-xl bg-slate-200/80" />
        <div className="h-10 w-11/12 animate-pulse rounded-xl bg-slate-200/70" />
        <div className="h-10 w-10/12 animate-pulse rounded-xl bg-slate-200/60" />
      </div>
    </div>
  ),
});
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const TABS = [
  { id: "privacy", label: "Privacy Policy" },
  { id: "terms", label: "Terms & Conditions" },
  { id: "about", label: "About App" },
  { id: "social", label: "Social Media" },
  { id: "quotes", label: "Quotes" },
];

function getTabMeta(tabId) {
  switch (tabId) {
    case "privacy":
      return { contentType: "Privacy Policy", title: "Privacy Policy" };
    case "terms":
      return { contentType: "Terms & Conditions", title: "Terms & Conditions" };
    case "about":
      // existing mock uses "About Us"
      return { contentType: "About Us", title: "About App" };
    case "social":
      return { contentType: "Custom", title: "Social Media" };
    case "quotes":
      return { contentType: "Custom", title: "Quotes" };
    default:
      return { contentType: "Custom", title: "Content" };
  }
}

function isRichTextEmpty(value) {
  const html = String(value ?? "");
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length === 0;
}

export default function ContentManagement() {
  const [contentItems, setContentItems] = useState(MOCK_CONTENT_ITEMS);
  const [activeTab, setActiveTab] = useState("privacy");
  const [editorTitle, setEditorTitle] = useState("Privacy Policy Editor");
  const [editorData, setEditorData] = useState("");
  const [termsDocId, setTermsDocId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [socialItems, setSocialItems] = useState([]);
  const [socialSearch, setSocialSearch] = useState("");
  const [socialModalOpen, setSocialModalOpen] = useState(false);
  const [socialModalMode, setSocialModalMode] = useState("add"); // 'add' | 'edit'
  const [socialDraft, setSocialDraft] = useState({
    id: null,
    name: "",
    url: "",
    platform: "",
    status: "Active",
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [socialModalError, setSocialModalError] = useState("");
  const [quotes, setQuotes] = useState([]);
  const [quoteSearch, setQuoteSearch] = useState("");
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [quoteModalMode, setQuoteModalMode] = useState("add"); // 'add' | 'edit'
  const [quoteDraft, setQuoteDraft] = useState({ id: null, text: "", status: "Active" });
  const [quoteModalError, setQuoteModalError] = useState("");
  const [quoteDeleteModalOpen, setQuoteDeleteModalOpen] = useState(false);
  const [quoteDeleteTarget, setQuoteDeleteTarget] = useState(null);

  const currentTabMeta = useMemo(() => getTabMeta(activeTab), [activeTab]);

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (!isMounted) return;
    const anyOpen =
      (activeTab === "quotes" && quoteModalOpen) ||
      (activeTab === "quotes" && quoteDeleteModalOpen) ||
      (activeTab === "social" && socialModalOpen) ||
      (activeTab === "social" && deleteModalOpen);
    if (!anyOpen) return;

    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (activeTab === "quotes" && quoteModalOpen) setQuoteModalOpen(false);
      if (activeTab === "quotes" && quoteDeleteModalOpen) {
        setQuoteDeleteModalOpen(false);
        setQuoteDeleteTarget(null);
      }
      if (activeTab === "social" && socialModalOpen) setSocialModalOpen(false);
      if (activeTab === "social" && deleteModalOpen) setDeleteModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMounted, activeTab, quoteModalOpen, quoteDeleteModalOpen, socialModalOpen, deleteModalOpen]);

  const upsertSocial = async () => {
    const token = localStorage.getItem("token");
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

    if (!baseUrl) {
      toast.error("API base URL is missing (NEXT_PUBLIC_API_BASE_URL).");
      return;
    }
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    setSocialModalError("");
    const platformValue = socialDraft.platform.trim();
    const urlValue = socialDraft.url.trim();
    const nameValue = socialDraft.name.trim();

    if (!platformValue || !urlValue) {
      setSocialModalError("Platform and URL are required.");
      return;
    }

    // Light URL validation + normalization for better UX.
    const normalizedUrl =
      /^https?:\/\//i.test(urlValue) ? urlValue : `https://${urlValue}`;
    try {
      // Will throw if invalid.
      // eslint-disable-next-line no-new
      new URL(normalizedUrl);
    } catch {
      setSocialModalError("Please enter a valid URL (e.g., https://instagram.com/...).");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", nameValue);
      formData.append("url", normalizedUrl);
      formData.append("platform", platformValue);
      formData.append("status", socialDraft.status || "Active");

      const endpoint =
        socialModalMode === "edit" && socialDraft.id
          ? `${baseUrl}/api/admin/update-social-media/${socialDraft.id}`
          : `${baseUrl}/api/admin/social-media`;

      const res = await axios.post(endpoint, formData, { headers: { token } });
      if (!res?.data?.success) {
        toast.error(res?.data?.message || "Failed to save social media");
        return;
      }

      toast.success(
        socialModalMode === "edit" ? "Social media updated successfully!" : "Social media added successfully!"
      );
      setSocialModalOpen(false);
      setSocialDraft({ id: null, name: "", url: "", platform: "", status: "Active" });
      setSocialModalError("");
      await fetchSocial();
    } catch (err) {
      console.error("Save social media failed:", err?.response?.data || err?.message);
      toast.error(err?.response?.data?.message || "Failed to save social media");
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDeleteQuote = async () => {
    const item = quoteDeleteTarget;
    if (!item?._id) return;

    const token = localStorage.getItem("token");
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

    if (!baseUrl) {
      toast.error("API base URL is missing (NEXT_PUBLIC_API_BASE_URL).");
      return;
    }
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post(
        `${baseUrl}/api/admin/delete-quotes/${item._id}`,
        {},
        { headers: { token } }
      );
      if (!res?.data?.success) {
        toast.error(res?.data?.message || "Failed to delete quote");
        return;
      }
      toast.success("Quote deleted successfully!");
      setQuoteDeleteModalOpen(false);
      setQuoteDeleteTarget(null);
      const refreshed = await axios.get(`${baseUrl}/api/admin/getAll-quotes`, {
        headers: { token },
      });
      setQuotes(Array.isArray(refreshed?.data?.result) ? refreshed.data.result : []);
    } catch (err) {
      console.error("Delete quote failed:", err?.response?.data || err?.message);
      toast.error(err?.response?.data?.message || "Failed to delete quote");
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDeleteSocial = async () => {
    const item = deleteTarget;
    if (!item?._id) return;

    const token = localStorage.getItem("token");
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

    if (!baseUrl) {
      toast.error("API base URL is missing (NEXT_PUBLIC_API_BASE_URL).");
      return;
    }
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post(
        `${baseUrl}/api/admin/delete-social-media/${item._id}`,
        {},
        { headers: { token } }
      );
      if (!res?.data?.success) {
        toast.error(res?.data?.message || "Failed to delete social media");
        return;
      }
      toast.success("Social media deleted successfully!");
      setDeleteModalOpen(false);
      setDeleteTarget(null);
      await fetchSocial();
    } catch (err) {
      console.error("Delete social media failed:", err?.response?.data || err?.message);
      toast.error(err?.response?.data?.message || "Failed to delete social media");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSocial = async () => {
    const token = localStorage.getItem("token");
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

    if (!baseUrl) {
      toast.error("API base URL is missing (NEXT_PUBLIC_API_BASE_URL).");
      return;
    }
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.get(`${baseUrl}/api/admin/getAll-social-media`, {
        headers: { token },
      });
      setSocialItems(Array.isArray(res?.data?.result) ? res.data.result : []);
    } catch (err) {
      console.error("Fetch social media failed:", err?.response?.data || err?.message);
      toast.error(err?.response?.data?.message || "Failed to fetch social media");
      setSocialItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const { contentType, title } = currentTabMeta;
    setEditorTitle(activeTab === "social" ? `${title} Manager` : `${title} Editor`);

    // Privacy Policy + About App are backed by API; other tabs still use mock/local state.
    if (activeTab === "privacy" || activeTab === "about" || activeTab === "terms") {
      const isPrivacy = activeTab === "privacy";
      const isTerms = activeTab === "terms";
      const fetchUrls = isTerms
        ? [
            "/api/admin/getAll-terms-condition",
            "/api/admin/getAll-terms-conditions",
            "/api/admin/get-all-terms-condition",
            "/api/admin/get-all-terms-conditions",
          ]
        : [
            isPrivacy ? "/api/admin/getAll-privacy-policy" : "/api/admin/getAll-about-app",
          ];

      const fetchContent = async () => {
        const token = localStorage.getItem("token");
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

        if (!baseUrl) {
          toast.error("API base URL is missing (NEXT_PUBLIC_API_BASE_URL).");
          return;
        }
        if (!token) {
          toast.error("Session expired. Please login again.");
          return;
        }

        setIsLoading(true);
        try {
          let res;
          for (const u of fetchUrls) {
            try {
              res = await axios.get(`${baseUrl}${u}`, {
                headers: { token, Authorization: `Bearer ${token}` },
              });
              break;
            } catch (e) {
              if (e?.response?.status === 404) continue;
              throw e;
            }
          }

          const list = res?.data?.result ?? [];
          const latest = Array.isArray(list) ? list[0] : null;
          setEditorData(latest?.content ?? "");
          if (isTerms) setTermsDocId(latest?._id ?? latest?.id ?? null);
        } catch (err) {
          console.error(
            `Fetch ${isTerms ? "terms & conditions" : isPrivacy ? "privacy policy" : "about app"} failed:`,
            err?.response?.data || err?.message
          );
          toast.error(
            err?.response?.data?.message ||
              `Failed to fetch ${isTerms ? "terms & conditions" : isPrivacy ? "privacy policy" : "about app"}`
          );
          setEditorData("");
          if (isTerms) setTermsDocId(null);
        } finally {
          setIsLoading(false);
        }
      };

      fetchContent();
      return;
    }

    if (activeTab === "social") {
      fetchSocial();
      setSocialModalOpen(false);
      setDeleteModalOpen(false);
      setDeleteTarget(null);
      setSocialModalMode("add");
      setSocialDraft({ id: null, name: "", url: "", platform: "", status: "Active" });
      setSocialSearch("");
      return;
    }

    if (activeTab === "quotes") {
      const fetchQuotes = async () => {
        const token = localStorage.getItem("token");
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

        if (!baseUrl) {
          toast.error("API base URL is missing (NEXT_PUBLIC_API_BASE_URL).");
          return;
        }
        if (!token) {
          toast.error("Session expired. Please login again.");
          return;
        }

        setIsLoading(true);
        try {
          const res = await axios.get(`${baseUrl}/api/admin/getAll-quotes`, {
            headers: { token },
          });
          setQuotes(Array.isArray(res?.data?.result) ? res.data.result : []);
        } catch (err) {
          console.error("Fetch quotes failed:", err?.response?.data || err?.message);
          toast.error(err?.response?.data?.message || "Failed to fetch quotes");
          setQuotes([]);
        } finally {
          setIsLoading(false);
        }
      };

      fetchQuotes();
      setQuoteSearch("");
      setQuoteModalOpen(false);
      setQuoteModalMode("add");
      setQuoteDraft({ id: null, text: "", status: "Active" });
      setQuoteModalError("");
      setQuoteDeleteModalOpen(false);
      setQuoteDeleteTarget(null);
      return;
    }

    const found = contentItems.find((c) => {
      if (contentType === "Custom") return c.contentType === "Custom" && c.title === title;
      return c.contentType === contentType;
    });

    setEditorData(found?.body || "");
  }, [activeTab, contentItems, currentTabMeta]);

  const handleSave = () => {
    const { contentType, title } = currentTabMeta;
    const today = new Date().toISOString().slice(0, 10);

    if (activeTab === "privacy" || activeTab === "about") {
      const isPrivacy = activeTab === "privacy";
      const saveUrl = isPrivacy ? "/api/admin/privacy-policy" : "/api/admin/about-app";

      const saveContent = async () => {
        const token = localStorage.getItem("token");
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

        if (isRichTextEmpty(editorData)) {
          toast.error(`Please enter ${isPrivacy ? "privacy policy" : "about app"} content.`, {
            id: `content-mgmt-empty:${activeTab}`,
          });
          return;
        }

        if (!baseUrl) {
          toast.error("API base URL is missing (NEXT_PUBLIC_API_BASE_URL).", {
            id: "content-mgmt-missing-base-url",
          });
          return;
        }
        if (!token) {
          toast.error("Session expired. Please login again.", {
            id: "content-mgmt-missing-token",
          });
          return;
        }

        setIsLoading(true);
        try {
          const formData = new FormData();
          formData.append("content", editorData);

          const res = await axios.post(`${baseUrl}${saveUrl}`, formData, {
            headers: { token },
          });

          if (res?.data?.success) {
            toast.success(`${isPrivacy ? "Privacy Policy" : "About App"} saved successfully!`, {
              id: `content-mgmt-saved:${activeTab}`,
            });
          } else {
            toast.error(
              res?.data?.message ||
                `Failed to save ${isPrivacy ? "privacy policy" : "about app"}`
              ,
              { id: `content-mgmt-save-failed:${activeTab}` }
            );
          }
        } catch (err) {
          console.error(
            `Save ${isPrivacy ? "privacy policy" : "about app"} failed:`,
            err?.response?.data || err?.message
          );
          toast.error(
            err?.response?.data?.message ||
              `Failed to save ${isPrivacy ? "privacy policy" : "about app"}`
            ,
            { id: `content-mgmt-save-failed:${activeTab}` }
          );
        } finally {
          setIsLoading(false);
        }
      };

      saveContent();
      return;
    }

    if (activeTab === "terms") {
      const saveTerms = async () => {
        const token = localStorage.getItem("token");
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

        if (isRichTextEmpty(editorData)) {
          toast.error("Please enter terms & conditions content.", {
            id: "content-mgmt-empty:terms",
          });
          return;
        }

        if (!baseUrl) {
          toast.error("API base URL is missing (NEXT_PUBLIC_API_BASE_URL).", {
            id: "content-mgmt-missing-base-url",
          });
          return;
        }
        if (!token) {
          toast.error("Session expired. Please login again.", {
            id: "content-mgmt-missing-token",
          });
          return;
        }

        setIsLoading(true);
        try {
          const formData = new FormData();
          formData.append("content", editorData);

          const endpoint = termsDocId
            ? `${baseUrl}/api/admin/update-terms-condition/${encodeURIComponent(termsDocId)}`
            : `${baseUrl}/api/admin/terms-condition`;

          const res = await axios.post(endpoint, formData, {
            headers: { token, Authorization: `Bearer ${token}` },
          });

          if (res?.data?.success) {
            toast.success("Terms & Conditions saved successfully!", { id: "content-mgmt-saved:terms" });
            const idFromRes =
              res?.data?.result?._id ??
              res?.data?.result?.id ??
              res?.data?.data?._id ??
              res?.data?.data?.id ??
              null;
            if (idFromRes) setTermsDocId(String(idFromRes));
          } else {
            toast.error(res?.data?.message || "Failed to save terms & conditions", {
              id: "content-mgmt-save-failed:terms",
            });
          }
        } catch (err) {
          console.error("Save terms & conditions failed:", err?.response?.data || err?.message);
          toast.error(err?.response?.data?.message || "Failed to save terms & conditions", {
            id: "content-mgmt-save-failed:terms",
          });
        } finally {
          setIsLoading(false);
        }
      };

      saveTerms();
      return;
    }

    setContentItems((prev) => {
      const idx = prev.findIndex((c) => {
        if (contentType === "Custom") return c.contentType === "Custom" && c.title === title;
        return c.contentType === contentType;
      });

      if (idx === -1) {
        const nextId = Math.max(0, ...prev.map((c) => c.id || 0)) + 1;
        return [
          ...prev,
          {
            id: nextId,
            title,
            contentType,
            status: "Published",
            excerpt: "",
            body: editorData,
            lastUpdated: today,
            createdAt: today,
          },
        ];
      }

      const copy = [...prev];
      copy[idx] = { ...copy[idx], body: editorData, lastUpdated: today };
      return copy;
    });

    toast.success(`${currentTabMeta.title} saved successfully!`);
  };

  const SkeletonBlock = ({ className }) => (
    <div className={`animate-pulse rounded-lg bg-slate-200/80 ${className || ""}`} />
  );

  const CenteredLoader = ({ label = "Loading..." }) => (
    <div className="min-h-[220px] flex items-center justify-center p-6">
      <div className="flex items-center gap-3 text-sm font-medium text-[#2158A3]">
        <span className="h-4 w-4 rounded-full border-2 border-[#0A3161]/30 border-t-[#0A3161] animate-spin" />
        <span>{label}</span>
      </div>
    </div>
  );

  const TableSkeleton = ({ cols = 4, rows = 6 }) => (
    <div className="p-5">
      <div className="overflow-x-auto">
        <div className="min-w-[900px] rounded-xl border border-[#C8D7E9] bg-white">
          <div className="grid grid-cols-12 gap-3 border-b border-[#C8D7E9] bg-[#F2F5FA] px-4 py-3">
            {Array.from({ length: cols }).map((_, i) => (
              <SkeletonBlock key={i} className="col-span-3 h-4" />
            ))}
          </div>
          <div className="divide-y divide-border/70">
            {Array.from({ length: rows }).map((_, r) => (
              <div key={r} className="grid grid-cols-12 gap-3 px-4 py-3">
                <SkeletonBlock className="col-span-5 h-4" />
                <SkeletonBlock className="col-span-3 h-4" />
                <SkeletonBlock className="col-span-2 h-4" />
                <SkeletonBlock className="col-span-2 h-4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-[80vh] py-8 px-1">
      <div className="">
        <AdminHeaderCard
          title="Content Management"
          subtitle="Manage app content and settings."
          className="mb-6"
        />

        {/* Tabs */}
        <div className="inline-flex rounded-lg border border-[#C8D7E9] bg-white p-1 shadow-sm">
          {TABS.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active
                    ? "bg-[#0A3161] text-white shadow-sm"
                    : "text-[#2158A3] hover:bg-[#F2F5FA]"
                  }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Editor */}
        <div className="mt-6 bg-white rounded-lg border border-[#C8D7E9] shadow-md p-6 md:p-4">
          <h2 className="text-sm font-semibold text-[#0A3161] mb-3">{editorTitle}</h2>

          {activeTab === "social" ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-[#0A3161]">Social Media Links</div>
                  <div className="text-xs text-[#5671A6]">
                    Add links shown inside the app (platform + URL). Use Edit/Delete for changes.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={socialSearch}
                    onChange={(e) => setSocialSearch(e.target.value)}
                    className="h-10 w-full md:w-[320px] rounded-lg border border-[#C8D7E9] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#0A3161]/30"
                    placeholder="Search platform or URL..."
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      setSocialModalMode("add");
                      setSocialDraft({ id: null, name: "", url: "", platform: "", status: "Active" });
                      setSocialModalOpen(true);
                    }}
                    className="bg-[#0A3161] hover:bg-[#0D3D7A] text-white font-medium px-4 whitespace-nowrap"
                  >
                    + Add
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-[#C8D7E9] overflow-hidden">
                <div className="flex items-center justify-between bg-[#F2F5FA] px-4 py-2">
                  <div className="text-xs font-semibold text-[#0A3161]">
                    Saved Links ({socialItems.length})
                  </div>
                  <div className="text-[11px] text-[#5671A6]">
                    Tip: Keep URLs valid (https://...)
                  </div>
                </div>

                {isLoading ? (
                  <TableSkeleton cols={4} rows={6} />
                ) : (() => {
                  const q = socialSearch.trim().toLowerCase();
                  const filtered = q
                    ? socialItems.filter((it) => {
                        const hay = `${it.platform || ""} ${it.url || ""} ${it.name || ""}`.toLowerCase();
                        return hay.includes(q);
                      })
                    : socialItems;

                  if (filtered.length === 0) {
                    return (
                      <div className="p-6 text-center">
                        <div className="text-sm font-medium text-[#0A3161]">
                          {socialItems.length === 0 ? "No links added yet" : "No results found"}
                        </div>
                        <div className="text-xs text-[#5671A6] mt-1">
                          {socialItems.length === 0
                            ? "Click “+ Add” to create your first social media link."
                            : "Try a different search."}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="overflow-x-auto">
                      <Table className="min-w-[900px]">
                        <TableHeader className="bg-white">
                          <TableRow>
                            <TableHead className="text-[#2158A3]">PLATFORM</TableHead>
                            <TableHead className="text-[#2158A3]">URL</TableHead>
                            <TableHead className="text-[#2158A3]">STATUS</TableHead>
                            <TableHead className="text-[#2158A3] text-right">ACTIONS</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="bg-white">
                          {filtered.map((item) => {
                            const status = item.status || "Active";
                            return (
                              <TableRow key={item._id || `${item.name}-${item.url}`}>
                                <TableCell className="font-medium text-[#0A3161]">
                                  {item.platform || "-"}
                                  {item.name ? (
                                    <div className="text-xs text-[#5671A6] mt-0.5">{item.name}</div>
                                  ) : null}
                                </TableCell>
                                <TableCell className="text-sm text-[#2158A3] break-words">
                                  {item.url || "-"}
                                </TableCell>
                                <TableCell>
                                  <span
                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                                      status === "Active"
                                        ? "bg-green-50 text-green-700 border-green-200"
                                        : status === "Inactive"
                                          ? "bg-amber-50 text-amber-700 border-amber-200"
                                          : "bg-gray-50 text-gray-700 border-gray-200"
                                    }`}
                                  >
                                    {status}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="inline-flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/18"
                                      aria-label="Edit social link"
                                      title="Edit"
                                      onClick={() => {
                                        setSocialModalMode("edit");
                                        setSocialDraft({
                                          id: item._id,
                                          name: item.name || "",
                                          url: item.url || "",
                                          platform: item.platform || "",
                                          status: item.status || "Active",
                                        });
                                        setSocialModalOpen(true);
                                      }}
                                    >
                                      <FaRegEdit className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                      aria-label="Delete social link"
                                      title="Delete"
                                      onClick={() => {
                                        setDeleteTarget(item);
                                        setDeleteModalOpen(true);
                                      }}
                                    >
                                      <HiOutlineTrash className="h-4 w-4" />
                                    </button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : activeTab === "quotes" ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-[#0A3161]">Quotes</div>
                  <div className="text-xs text-[#5671A6]">
                    Manage motivational quotes shown in the app.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={quoteSearch}
                    onChange={(e) => setQuoteSearch(e.target.value)}
                    className="h-10 w-full md:w-[420px] rounded-lg border border-[#C8D7E9] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#0A3161]/30"
                    placeholder="Search quotes..."
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      setQuoteModalMode("add");
                      setQuoteDraft({ id: null, text: "", status: "Active" });
                      setQuoteModalError("");
                      setQuoteModalOpen(true);
                    }}
                    className="bg-[#0A3161] hover:bg-[#0D3D7A] text-white font-medium px-4 whitespace-nowrap"
                  >
                    + Add
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-[#C8D7E9] overflow-hidden">
                <div className="flex items-center justify-between bg-[#F2F5FA] px-4 py-2">
                  <div className="text-xs font-semibold text-[#0A3161]">
                    Saved Quotes ({quotes.length})
                  </div>
                </div>

                {isLoading ? (
                  <TableSkeleton cols={4} rows={6} />
                ) : (() => {
                  const q = quoteSearch.trim().toLowerCase();
                  const filtered = q
                    ? quotes.filter((it) => String(it.text || "").toLowerCase().includes(q))
                    : quotes;

                  if (filtered.length === 0) {
                    return (
                      <div className="p-6 text-center">
                        <div className="text-sm font-medium text-[#0A3161]">
                          {quotes.length === 0 ? "No quotes added yet" : "No results found"}
                        </div>
                        <div className="text-xs text-[#5671A6] mt-1">
                          {quotes.length === 0
                            ? "Click “+ Add” to create your first quote."
                            : "Try a different search."}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="overflow-x-auto">
                      <Table className="min-w-[900px] table-fixed">
                        <TableHeader className="bg-white">
                          <TableRow>
                            <TableHead className="text-[#2158A3] w-[55%]">QUOTE</TableHead>
                            <TableHead className="text-[#2158A3] w-[15%]">STATUS</TableHead>
                            <TableHead className="text-[#2158A3] w-[15%]">CREATED</TableHead>
                            <TableHead className="text-[#2158A3] text-right w-[15%]">ACTIONS</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="bg-white">
                          {filtered.map((item) => {
                            const status = item.status || "Active";
                            const created = item.createdAt
                              ? new Date(item.createdAt).toISOString().slice(0, 10)
                              : "-";
                            return (
                              <TableRow key={item._id || item.text}>
                                <TableCell className="font-medium text-[#0A3161]">
                                  <div
                                    className="break-words whitespace-pre-wrap line-clamp-2"
                                    title={item.text || ""}
                                  >
                                    {item.text}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span
                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                                      status === "Active"
                                        ? "bg-green-50 text-green-700 border-green-200"
                                        : status === "Inactive"
                                          ? "bg-amber-50 text-amber-700 border-amber-200"
                                          : "bg-gray-50 text-gray-700 border-gray-200"
                                    }`}
                                  >
                                    {status}
                                  </span>
                                </TableCell>
                                <TableCell className="text-sm text-[#2158A3]">{created}</TableCell>
                                <TableCell className="text-right">
                                  <div className="inline-flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/18"
                                      aria-label="Edit quote"
                                      title="Edit"
                                      onClick={() => {
                                        setQuoteModalMode("edit");
                                        setQuoteDraft({
                                          id: item._id,
                                          text: item.text || "",
                                          status: item.status || "Active",
                                        });
                                        setQuoteModalError("");
                                        setQuoteModalOpen(true);
                                      }}
                                    >
                                      <FaRegEdit className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                      aria-label="Delete quote"
                                      title="Delete"
                                      onClick={() => {
                                        setQuoteDeleteTarget(item);
                                        setQuoteDeleteModalOpen(true);
                                      }}
                                    >
                                      <HiOutlineTrash className="h-4 w-4" />
                                    </button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="border border-[#C8D7E9] rounded-lg overflow-hidden [&_.ck-editor__editable]:min-h-[360px] [&_.ck-editor__editable]:p-4 [&_.ck-toolbar]:border-t-0 [&_.ck-toolbar]:border-l-0 [&_.ck-toolbar]:border-r-0 [&_.ck-toolbar]:border-b [&_.ck-toolbar]:border-gray-200">
              {isLoading ? (
                <CenteredLoader label="Loading content…" />
              ) : (
                <RichTextEditor
                  key={activeTab}
                  data={editorData}
                  onChange={setEditorData}
                  config={{
                    placeholder: `Enter ${currentTabMeta.title.toLowerCase()}...`,
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
              )}
            </div>
          )}

          {activeTab !== "social" && activeTab !== "quotes" && (
            <div className="mt-6">
              <Button
                type="button"
                onClick={handleSave}
                disabled={isLoading}
                aria-disabled={isLoading}
                className="bg-[#0A3161] hover:bg-[#0D3D7A] text-white font-medium px-6 gap-2"
              >
                <FaSave className="h-4 w-4" />
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Quotes: Add Modal */}
      {isMounted && activeTab === "quotes" && quoteModalOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 backdrop-blur-sm"
              onClick={() => setQuoteModalOpen(false)}
            >
              <div
                className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
            <div className="bg-gradient-to-r from-[#0A3161] to-[#0D3D7A] px-6 py-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-white font-semibold text-lg">
                  {quoteModalMode === "edit" ? "Edit Quote" : "Add Quote"}
                </h3>
                <p className="text-white/80 text-xs mt-1">
                  Keep it short and motivational.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuoteModalOpen(false)}
                className="text-white/80 hover:text-white text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              {quoteModalError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {quoteModalError}
                </div>
              ) : null}

              <div>
                <label className="text-xs font-medium text-[#2158A3]">
                  Quote Text <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={quoteDraft.text}
                  onChange={(e) => setQuoteDraft((s) => ({ ...s, text: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-[#C8D7E9] bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0A3161]/30 resize-none"
                  placeholder="Enter quote..."
                />
                <div className="mt-1 text-[11px] text-[#5671A6]">
                  You can use up to ~200 characters.
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border-t border-[#C8D7E9] px-6 py-4 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setQuoteModalOpen(false)}
                className="border-[#C8D7E9] text-[#0A3161]"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  setQuoteModalError("");
                  const text = quoteDraft.text.trim();
                  if (!text) {
                    setQuoteModalError("Quote text is required.");
                    return;
                  }

                  const token = localStorage.getItem("token");
                  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

                  if (!baseUrl) {
                    toast.error("API base URL is missing (NEXT_PUBLIC_API_BASE_URL).");
                    return;
                  }
                  if (!token) {
                    toast.error("Session expired. Please login again.");
                    return;
                  }

                  setIsLoading(true);
                  try {
                    const formData = new FormData();
                    formData.append("text", text);
                    if (quoteModalMode === "edit" && quoteDraft.id) {
                      formData.append("status", quoteDraft.status || "Active");
                    }

                    const endpoint =
                      quoteModalMode === "edit" && quoteDraft.id
                        ? `${baseUrl}/api/admin/update-quotes/${quoteDraft.id}`
                        : `${baseUrl}/api/admin/add-quotes`;

                    const res = await axios.post(endpoint, formData, { headers: { token } });

                    if (!res?.data?.success) {
                      setQuoteModalError(res?.data?.message || "Failed to save quote");
                      return;
                    }

                    toast.success(
                      quoteModalMode === "edit" ? "Quote updated successfully!" : "Quote added successfully!"
                    );
                    setQuoteModalOpen(false);
                    setQuoteDraft({ id: null, text: "", status: "Active" });

                    const refreshed = await axios.get(`${baseUrl}/api/admin/getAll-quotes`, {
                      headers: { token },
                    });
                    setQuotes(Array.isArray(refreshed?.data?.result) ? refreshed.data.result : []);
                  } catch (err) {
                    console.error("Add quote failed:", err?.response?.data || err?.message);
                    setQuoteModalError(err?.response?.data?.message || "Failed to save quote");
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
                aria-disabled={isLoading}
                className="bg-[#0A3161] hover:bg-[#0D3D7A] text-white"
              >
                {isLoading ? "Saving..." : quoteModalMode === "edit" ? "Update Quote" : "Add Quote"}
              </Button>
            </div>
          </div>
            </div>,
            document.body
          )
        : null}

      {/* Social: Add/Edit Modal */}
      {isMounted && activeTab === "social" && socialModalOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 backdrop-blur-sm"
              onClick={() => setSocialModalOpen(false)}
            >
              <div
                className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
            <div className="bg-gradient-to-r from-[#0A3161] to-[#0D3D7A] px-6 py-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-white font-semibold text-lg">
                  {socialModalMode === "edit" ? "Edit Social Link" : "Add Social Link"}
                </h3>
                <p className="text-white/80 text-xs mt-1">
                  Provide platform and URL to display in the app.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSocialModalOpen(false)}
                className="text-white/80 hover:text-white text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              {socialModalError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {socialModalError}
                </div>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-[#2158A3]">
                    Platform <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={socialDraft.platform}
                    onChange={(e) => setSocialDraft((s) => ({ ...s, platform: e.target.value }))}
                    className="mt-1.5 h-11 w-full rounded-lg border border-[#C8D7E9] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#0A3161]/30"
                    placeholder="Instagram / Facebook / YouTube"
                  />
                  <div className="mt-1 text-[11px] text-[#5671A6]">
                    Example: Instagram
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#2158A3]">Name</label>
                  <input
                    value={socialDraft.name}
                    onChange={(e) => setSocialDraft((s) => ({ ...s, name: e.target.value }))}
                    className="mt-1.5 h-11 w-full rounded-lg border border-[#C8D7E9] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#0A3161]/30"
                    placeholder="Optional label"
                  />
                  <div className="mt-1 text-[11px] text-[#5671A6]">
                    Optional display name (if your API stores it).
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[#2158A3]">
                  URL <span className="text-red-500">*</span>
                </label>
                <input
                  value={socialDraft.url}
                  onChange={(e) => setSocialDraft((s) => ({ ...s, url: e.target.value }))}
                  className="mt-1.5 h-11 w-full rounded-lg border border-[#C8D7E9] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#0A3161]/30"
                  placeholder="https://instagram.com/yourpage"
                />
                <div className="mt-1 text-[11px] text-[#5671A6]">
                  We’ll auto-add <span className="font-medium">https://</span> if missing.
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[#2158A3]">Status</label>
                <select
                  value={socialDraft.status}
                  onChange={(e) => setSocialDraft((s) => ({ ...s, status: e.target.value }))}
                  className="mt-1.5 h-11 w-full rounded-lg border border-[#C8D7E9] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#0A3161]/30"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="bg-gray-50 border-t border-[#C8D7E9] px-6 py-4 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setSocialModalOpen(false)}
                className="border-[#C8D7E9] text-[#0A3161]"
              >
                Cancel
              </Button>
              <Button
                onClick={upsertSocial}
                disabled={isLoading}
                aria-disabled={isLoading}
                className="bg-[#0A3161] hover:bg-[#0D3D7A] text-white"
              >
                {isLoading ? "Saving..." : socialModalMode === "edit" ? "Update Link" : "Add Link"}
              </Button>
            </div>
          </div>
            </div>,
            document.body
          )
        : null}

      {/* Social: Delete Modal */}
      {isMounted && activeTab === "social" && deleteModalOpen && deleteTarget
        ? createPortal(
            <div
              className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 backdrop-blur-sm"
              onClick={() => setDeleteModalOpen(false)}
            >
              <div
                className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
            <div className="bg-gradient-to-r from-[#0A3161] to-[#0D3D7A] px-6 py-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-white font-semibold text-lg">Delete Social Link</h3>
                <p className="text-white/80 text-xs mt-1">This action cannot be undone.</p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="text-white/80 hover:text-white text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-3">
              <div className="rounded-xl border border-[#C8D7E9] bg-[#F2F5FA] px-4 py-3">
                <div className="text-sm font-semibold text-[#0A3161] break-words">
                  {deleteTarget.platform}
                </div>
                <div className="text-xs text-[#2158A3] break-words">{deleteTarget.url}</div>
              </div>
              <div className="text-xs text-[#5671A6]">
                Confirm delete to remove this link from the app.
              </div>
            </div>
            <div className="bg-gray-50 border-t border-[#C8D7E9] px-6 py-4 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteModalOpen(false)}
                className="border-[#C8D7E9] text-[#0A3161]"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDeleteSocial}
                disabled={isLoading}
                aria-disabled={isLoading}
                className="bg-[#0A3161] hover:bg-[#0D3D7A] text-white"
              >
                {isLoading ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
            </div>,
            document.body
          )
        : null}

      {/* Quotes: Delete Modal */}
      {isMounted && activeTab === "quotes" && quoteDeleteModalOpen && quoteDeleteTarget
        ? createPortal(
            <div
              className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 backdrop-blur-sm"
              onClick={() => {
                setQuoteDeleteModalOpen(false);
                setQuoteDeleteTarget(null);
              }}
            >
              <div
                className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-gradient-to-r from-[#0A3161] to-[#0D3D7A] px-6 py-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-white font-semibold text-lg">Delete Quote</h3>
                    <p className="text-white/80 text-xs mt-1">This action cannot be undone.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setQuoteDeleteModalOpen(false);
                      setQuoteDeleteTarget(null);
                    }}
                    className="text-white/80 hover:text-white text-xl leading-none"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <div className="p-6 space-y-3">
                  <div className="rounded-xl border border-[#C8D7E9] bg-[#F2F5FA] px-4 py-3">
                    <div className="text-sm font-semibold text-[#0A3161] break-words line-clamp-4 whitespace-pre-wrap">
                      {quoteDeleteTarget.text || "—"}
                    </div>
                  </div>
                  <div className="text-xs text-[#5671A6]">
                    Confirm delete to remove this quote from the app.
                  </div>
                </div>
                <div className="bg-gray-50 border-t border-[#C8D7E9] px-6 py-4 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQuoteDeleteModalOpen(false);
                      setQuoteDeleteTarget(null);
                    }}
                    className="border-[#C8D7E9] text-[#0A3161]"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmDeleteQuote}
                    disabled={isLoading}
                    aria-disabled={isLoading}
                    className="bg-[#0A3161] hover:bg-[#0D3D7A] text-white"
                  >
                    {isLoading ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
