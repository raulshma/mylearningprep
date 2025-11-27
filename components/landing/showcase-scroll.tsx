"use client";

import { motion } from "framer-motion";
import { ArrowRight, Layers, Code2, Users, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

const items = [
    {
        id: 1,
        title: "System Design",
        subtitle: "Architect Scalable Systems",
        description:
            "Master the art of designing large-scale distributed systems. From load balancers to database sharding.",
        color: "text-blue-500",
        bg: "bg-blue-500/10",
        gradient: "from-blue-600 to-blue-900",
        icon: Layers,
    },
    {
        id: 2,
        title: "Data Structures",
        subtitle: "Optimize Your Code",
        description:
            "Deep dive into trees, graphs, and dynamic programming. Write efficient, production-ready code.",
        color: "text-green-500",
        bg: "bg-green-500/10",
        gradient: "from-emerald-600 to-emerald-900",
        icon: Code2,
    },
    {
        id: 3,
        title: "Behavioral",
        subtitle: "Lead with Confidence",
        description:
            "Learn to articulate your impact and leadership style using the STAR method.",
        color: "text-purple-500",
        bg: "bg-purple-500/10",
        gradient: "from-purple-600 to-purple-900",
        icon: Users,
    },
    {
        id: 4,
        title: "Frontend Mastery",
        subtitle: "Build Modern UIs",
        description:
            "Expert-level React, performance optimization, and accessibility patterns.",
        color: "text-orange-500",
        bg: "bg-orange-500/10",
        gradient: "from-orange-600 to-orange-900",
        icon: LayoutTemplate,
    },
];

export function ShowcaseScroll() {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    return (
        <section className="py-32 bg-background overflow-hidden">
            <div className="max-w-7xl mx-auto px-6 mb-16 flex items-end justify-between">
                <div>
                    <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-foreground">
                        Comprehensive Modules.
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-xl leading-relaxed">
                        Everything you need to crack the interview, broken down into
                        digestible paths.
                    </p>
                </div>
            </div>

            <div className="relative">
                <div
                    ref={scrollRef}
                    className="flex overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing select-none px-6 md:px-0"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                >
                    <div className="flex gap-6 md:gap-8 min-w-full md:pl-[max(24px,calc((100vw-1280px)/2))] pr-6">
                        {items.map((item, index) => (
                            <motion.div
                                key={item.id}
                                className="flex-shrink-0 w-[85vw] md:w-[420px] h-[520px] relative rounded-[2rem] overflow-hidden group cursor-pointer shadow-xl transition-all duration-500 hover:shadow-2xl"
                                whileHover={{ y: -8, scale: 1.02 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                            >
                                {/* Background Image/Gradient */}
                                <div
                                    className={cn(
                                        "absolute inset-0 bg-gradient-to-br transition-transform duration-700 group-hover:scale-110",
                                        item.gradient
                                    )}
                                />

                                {/* Overlay */}
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-500" />

                                <div className="absolute inset-0 p-8 flex flex-col justify-between text-white">
                                    <div className="flex justify-between items-start">
                                        <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl">
                                            <item.icon className="w-8 h-8 text-white" />
                                        </div>
                                    </div>

                                    <div className="space-y-4 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                        <div>
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-white/70 mb-2">
                                                {item.subtitle}
                                            </h3>
                                            <h4 className="text-4xl font-bold tracking-tight leading-tight">
                                                {item.title}
                                            </h4>
                                        </div>
                                        <p className="text-lg text-white/80 leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all duration-300">
                                            {item.description}
                                        </p>
                                        <div className="pt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                                            <Button
                                                variant="secondary"
                                                className="rounded-full bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md"
                                            >
                                                Explore Module
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
