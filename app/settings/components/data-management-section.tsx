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
      className="bg-card border border-border p-6 hover:border-primary/30 transition-colors group"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
          <Database className="w-5 h-5 text-foreground" />
        </div>
        <div>
          <h2 className="font-mono text-lg text-foreground">Data & Privacy</h2>
          <p className="text-xs text-muted-foreground">Manage your data</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Privacy info */}
        <div className="flex items-start gap-3 p-4 bg-secondary/30 border border-border">
          <Shield className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm text-foreground mb-1">Your data is secure</p>
            <p className="text-xs text-muted-foreground">
              We encrypt sensitive data and never share your information with third parties.
            </p>
          </div>
        </div>

        {/* Export */}
        <div className="flex items-center justify-between p-4 bg-secondary/30 border border-border">
          <div>
            <p className="text-sm text-foreground">Export all data</p>
            <p className="text-xs text-muted-foreground">Download your preps and settings</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExport}
            disabled={isExporting}
            className="bg-transparent"
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
        <div className="flex items-center justify-between p-4 bg-destructive/5 border border-destructive/20">
          <div>
            <p className="text-sm text-foreground">Delete account</p>
            <p className="text-xs text-muted-foreground">Permanently remove all data</p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-mono">Delete Account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. All your interview preps, settings, and data will be permanently deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
