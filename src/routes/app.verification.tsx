import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock, AlertCircle, XCircle, FileText, Upload, User } from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { currentUser, useDemo } from "@/lib/demo/store";
import { StatusBadge } from "@/components/brand";
import { toast } from "sonner";
import type { KycStatus } from "@/lib/domain/types";

export const Route = createFileRoute("/app/verification")({ component: Verification });

function Verification() {
  const user = useDemo((s) => currentUser(s));
  const status: KycStatus = user?.kycStatus ?? "draft";

  const steps = [
    { id: "draft", label: "Account created", desc: "Your account was created." },
    { id: "submitted", label: "Documents submitted", desc: "You submitted verification documents." },
    { id: "pending_review", label: "Under review", desc: "Your documents are being reviewed." },
    { id: "approved", label: "Verified", desc: "Your account is fully verified." },
  ];

  const statusOrder = ["draft", "submitted", "pending_review", "additional_information_required", "approved", "rejected"];
  const currentIdx = statusOrder.indexOf(status);
  const stepIdx = (id: string) => {
    const idx = statusOrder.indexOf(id);
    if (status === "rejected") return idx <= currentIdx ? "done" : "todo";
    if (status === "additional_information_required") return idx <= 2 ? "done" : "todo";
    return idx <= currentIdx ? "done" : "todo";
  };

  const icons = {
    done: <CheckCircle2 className="h-5 w-5 text-success" />,
    active: <Clock className="h-5 w-5 text-warning" />,
    todo: <div className="h-5 w-5 rounded-full border-2 border-muted" />,
  };

  return (
    <>
      <PageHeader
        title="Verification"
        desc="Your identity verification status and requirements."
      />
      <div className="mb-6 rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Current status</p>
            <p className="mt-1 text-lg font-semibold capitalize">
              <StatusBadge status={status} />
            </p>
          </div>
          {status === "approved" ? (
            <CheckCircle2 className="h-12 w-12 text-success" />
          ) : status === "rejected" ? (
            <XCircle className="h-12 w-12 text-destructive" />
          ) : (
            <AlertCircle className="h-12 w-12 text-warning" />
          )}
        </div>
        {status === "rejected" && (
          <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            Your verification was rejected. Please contact support for assistance.
          </p>
        )}
        {status === "additional_information_required" && (
          <p className="mt-3 rounded-lg bg-warning/10 p-3 text-sm text-warning">
            Additional information is required. Please submit the requested documents.
          </p>
        )}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Verification progress</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            {steps.map((s) => {
              const st = stepIdx(s.id);
              return (
                <li key={s.id} className="flex items-start gap-3">
                  {st === "done" ? icons.done : icons.todo}
                  <div>
                    <p className={`text-sm font-medium ${st === "done" ? "" : "text-muted-foreground"}`}>
                      {s.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      {(status === "draft" || status === "additional_information_required") && (
        <Card>
          <CardHeader>
            <CardTitle>Submit verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-4 text-center">
                <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">ID document</p>
                <p className="text-xs text-muted-foreground">National ID, passport, or driver's license</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => toast.info("Demo only — document upload is simulated")}
                >
                  <Upload className="mr-1 h-3 w-3" /> Upload
                </Button>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <User className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Selfie verification</p>
                <p className="text-xs text-muted-foreground">A photo to confirm your identity</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => toast.info("Demo only — selfie upload is simulated")}
                >
                  <Upload className="mr-1 h-3 w-3" /> Upload
                </Button>
              </div>
            </div>
            <Button onClick={() => toast.info("Demo only — verification submission is simulated")}>
              Submit for review
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}
