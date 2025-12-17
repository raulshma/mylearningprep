'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Download, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function DataManagementActions() {
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success("Export started. You'll receive an email when ready.");
    } catch {
      toast.error("Failed to start export");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success("Account deletion initiated");
    } catch {
      toast.error("Failed to delete account");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Export */}
      <div className="flex items-center justify-between gap-4 p-5 rounded-2xl bg-secondary/30 border border-white/5 hover:bg-secondary/50 transition-colors">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">Export all data</p>
          <p className="text-xs text-muted-foreground truncate">Download your preps and settings</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={isExporting}
          className="bg-transparent border-white/10 hover:bg-background/50 rounded-full h-9 px-4"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Export
        </Button>
      </div>

      {/* Delete account */}
      <div className="flex items-center justify-between gap-4 p-5 rounded-2xl bg-destructive/5 border border-destructive/10 hover:bg-destructive/10 transition-colors">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">Delete account</p>
          <p className="text-xs text-muted-foreground truncate">Permanently remove all data</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="rounded-full h-9 px-4 bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-none">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-3xl border-white/10 bg-card/95">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold">Delete Account?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                This action cannot be undone. All your interview preps, settings, and data will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-full border-white/10">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
