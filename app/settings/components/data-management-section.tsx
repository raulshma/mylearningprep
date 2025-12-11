'use client';

import { useState } from "react";
import { motion } from "framer-motion";
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
import { Database, Download, Trash2, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function DataManagementSection() {
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Simulate export - replace with actual export logic
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
      // Simulate delete - replace with actual delete logic
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success("Account deletion initiated");
    } catch {
      toast.error("Failed to delete account");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl hover:border-primary/20 transition-all duration-300 shadow-sm"
    >
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/10">
          <Database className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Data & Privacy</h2>
          <p className="text-sm text-muted-foreground">Manage your data</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Privacy info */}
        <div className="flex items-start gap-4 p-5 rounded-2xl bg-secondary/30 border border-white/5">
          <div className="w-10 h-10 rounded-full bg-background/50 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground mb-1">Your data is secure</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We encrypt sensitive data and never share your information with third parties.
            </p>
          </div>
        </div>

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
            <AlertDialogContent className="rounded-3xl border-white/10 bg-card/95 backdrop-blur-xl">
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
      </div>
    </motion.div>
  );
}
