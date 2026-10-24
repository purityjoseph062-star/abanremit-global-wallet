import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { requirePermission } from "@/lib/guard";
import { PageHeader } from "@/components/portal-shell";
import { StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/agent/support")({
  ssr: false,
  beforeLoad: () => requirePermission("agent.dashboard.view"),
  head: () => ({ meta: [{ title: "Support — Agent portal" }] }),
  component: AgentSupport,
});

function AgentSupport() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["agent-tickets"],
    queryFn: () => api.agents.supportTickets(),
  });
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState("Transaction dispute");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [txRef, setTxRef] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");

  const create = useMutation({
    mutationFn: () =>
      api.agents.createTicket({ category, subject, description, txRef: txRef || undefined }),
    onSuccess: () => {
      qc.invalidateQueries();
      setShowForm(false);
      setSubject("");
      setDescription("");
      setTxRef("");
      toast.success("Ticket created");
    },
    onError: (e) => toast.error(e.message),
  });

  const reply = useMutation({
    mutationFn: () => api.agents.replyTicket(replyTo!, replyBody),
    onSuccess: () => {
      qc.invalidateQueries();
      setReplyTo(null);
      setReplyBody("");
      toast.success("Reply sent");
    },
    onError: (e) => toast.error(e.message),
  });

  const items = list.data ?? [];

  return (
    <div>
      <PageHeader
        title="Support"
        desc="Open and track support tickets for disputes and issues."
        action={
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button>New ticket</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Open support ticket</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Transaction dispute">Transaction dispute</SelectItem>
                      <SelectItem value="Float issue">Float issue</SelectItem>
                      <SelectItem value="Customer verification">Customer verification</SelectItem>
                      <SelectItem value="Technical problem">Technical problem</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subject</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div>
                  <Label>Transaction reference (optional)</Label>
                  <Input
                    value={txRef}
                    onChange={(e) => setTxRef(e.target.value)}
                    placeholder="DEMO-CIN-XXXXX"
                  />
                </div>
                <Button
                  disabled={!subject.trim() || !description.trim() || create.isPending}
                  onClick={() => create.mutate()}
                >
                  {create.isPending ? "Creating…" : "Submit ticket"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No support tickets. Open a ticket if you need help with a transaction or issue.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t.subject}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {t.reference} · {t.category} · {new Date(t.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
                <div className="mt-3 space-y-2">
                  {t.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-lg p-2.5 text-sm ${m.author === "Support" ? "bg-secondary" : "bg-primary/5"}`}
                    >
                      <p className="text-xs font-semibold">
                        {m.author} · {new Date(m.at).toLocaleString()}
                      </p>
                      <p>{m.body}</p>
                    </div>
                  ))}
                </div>
                {t.status !== "closed" && t.status !== "resolved" && (
                  <div className="mt-3">
                    {replyTo === t.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={replyBody}
                          onChange={(e) => setReplyBody(e.target.value)}
                          placeholder="Type your reply"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={!replyBody.trim() || reply.isPending}
                            onClick={() => reply.mutate()}
                          >
                            {reply.isPending ? "Sending…" : "Send"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setReplyTo(null);
                              setReplyBody("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setReplyTo(t.id)}>
                        Reply
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
