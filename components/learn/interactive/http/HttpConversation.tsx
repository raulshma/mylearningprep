"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Server, Send, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

const conversationSteps = [
  {
    sender: "client",
    text: "Hello Server! Can you give me the homepage?",
    actionLabel: "Send Request",
  },
  {
    sender: "server",
    text: "Hello Client! Sure, here is the homepage HTML file.",
    actionLabel: "Wait for Response...",
  },
  {
    sender: "client",
    text: "Thanks! Now can I have the 'cat.jpg' image?",
    actionLabel: "Request Image",
  },
  {
    sender: "server",
    text: "Here is 'cat.jpg'. Meow!",
    actionLabel: "Wait for Response...",
  },
];

export function HttpConversation() {
  const [messages, setMessages] = useState<
    { id: string; sender: "client" | "server"; text: string }[]
  >([]);
  const [isTyping, setIsTyping] = useState(false);
  const [step, setStep] = useState(0);

  const handleNextStep = () => {
    if (step >= conversationSteps.length || isTyping) return;

    const currentStepData = conversationSteps[step];

    // Only handle client steps manually (via button click)
    if (currentStepData.sender === "client") {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "client",
          text: currentStepData.text,
        },
      ]);
      setStep((prev) => prev + 1);
    }
  };

  useEffect(() => {
    if (step >= conversationSteps.length) return;

    const currentStepData = conversationSteps[step];
    
    if (currentStepData.sender === "server" && !isTyping) {
      // Start typing simulation for server
      setIsTyping(true);
      
      const timer = setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "server",
            text: currentStepData.text,
          },
        ]);
        setStep((prev) => prev + 1);
      }, 1500);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const isClientTurn =
    step < conversationSteps.length && conversationSteps[step].sender === "client";

  return (
    <div className="w-full max-w-2xl mx-auto my-8 border rounded-xl overflow-hidden bg-card shadow-sm">
      <div className="bg-muted/50 p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-full">
            <MessageSquare className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-sm">HTTP Conversation Simulation</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {messages.length} messages
        </div>
      </div>

      <div className="p-6 min-h-[400px] flex flex-col justify-between gap-4 bg-background">
        <div className="space-y-4 flex-1">
          <AnimatePresence initial={false}>
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-muted-foreground text-sm my-10 italic"
              >
                No messages yet. Start the conversation!
              </motion.div>
            )}
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex gap-3 ${
                  msg.sender === "client" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.sender === "client" ? "bg-blue-100" : "bg-green-100"
                  }`}
                >
                  {msg.sender === "client" ? (
                    <User className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Server className="w-4 h-4 text-green-600" />
                  )}
                </div>
                <div
                  className={`p-3 rounded-2xl max-w-[80%] text-sm ${
                    msg.sender === "client"
                      ? "bg-blue-600 text-white rounded-tr-sm"
                      : "bg-muted text-foreground rounded-tl-sm"
                  }`}
                >
                  {msg.text}
                </div>
              </motion.div>
            ))}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                 <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-100 shrink-0">
                    <Server className="w-4 h-4 text-green-600" />
                 </div>
                 <div className="p-3 rounded-2xl bg-muted rounded-tl-sm flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-muted-foreground/30 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-muted-foreground/30 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-muted-foreground/30 rounded-full animate-bounce"></span>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="pt-4 border-t mt-4">
          <Button
            onClick={handleNextStep}
            disabled={!isClientTurn || isTyping}
            className="w-full gap-2 transition-all"
            size="lg"
            variant={isClientTurn ? "default" : "secondary"}
          >
            {step >= conversationSteps.length ? (
              "Conversation Complete"
            ) : (
              <>
                {isClientTurn ? <Send className="w-4 h-4" /> : <Server className="w-4 h-4" />}
                {isClientTurn
                  ? conversationSteps[step].actionLabel
                  : "Waiting for server..."}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
