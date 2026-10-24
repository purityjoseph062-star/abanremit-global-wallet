import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/portal-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/brand";

export const Route = createFileRoute("/app/support")({ component: Support });

function Support() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["customer-support"], queryFn: api.support.list });
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState("Transaction dispute");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");

  const create = useMutation({
    mutationFn: () => api.support.create({ category, subject, description }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-support"] });
      setShowForm(false);
      setSubject("");
      setDescription("");
      toast.success("Ticket created");
    },
    onError: (e) => toast.error(e.message),
  });

  const reply = useMutation({
    mutationFn: () => api.support.reply(replyTo!, replyBody),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-support"] });
      setReplyTo(null);
      setReplyBody("");
      toast.success("Reply sent");
    },
    onError: (e) => toast.error(e.message),
  });

  const items = list.data ?? [];

  return (
    <>
      <PageHeader
        title="Support"
        desc="Open and track support tickets for your account."
        action={
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button>New ticket</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Open a support ticket</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Transaction dispute">Transaction dispute</SelectItem>
                      <SelectItem value="Account issue">Account issue</SelectItem>
                      <SelectItem value="Verification">Verification</SelectItem>
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
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No support tickets. Open a ticket if you need help.
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
                      className={`rounded-lg p-2.5 text-sm ${m.author !== "Support" ? "bg-primary/5" : "bg-secondary"}`}
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
                            onClick={() => { setReplyTo(null); setReplyBody(""); }}
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
    </>
  );
}
