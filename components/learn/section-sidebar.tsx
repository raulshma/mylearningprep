'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, ChevronRight, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface SectionSidebarProps {
  sections: string[];
  completedSections: string[];
  currentSection?: string;
  className?: string;
}

function formatSectionName(sectionId: string): string {
  return sectionId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function scrollToSection(sectionId: string) {
  // Find the section element by ID
  // ProgressCheckpoint components should have IDs matching section names
  const element = document.getElementById(`section-${sectionId}`);
  
  if (element) {
    // Smooth scroll to the element with offset for header
    const offset = 100; // Adjust based on your header height
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }
}

function SectionList({ sections, completedSections, currentSection }: SectionSidebarProps) {
  return (
    <nav className="space-y-1">
      {sections.map((section, index) => {
        const isCompleted = completedSections.includes(section);
        const isCurrent = currentSection === section;
        
        return (
          <button
            key={section}
            onClick={() => scrollToSection(section)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              'hover:bg-accent/50',
              isCurrent && 'bg-accent text-accent-foreground',
              !isCurrent && 'text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="flex-shrink-0">
              {isCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
            </div>
            
            <span className="flex-1 text-left truncate">
              {formatSectionName(section)}
            </span>
            
            {isCurrent && (
              <ChevronRight className="w-4 h-4 flex-shrink-0" />
            )}
          </button>
        );
      })}
    </nav>
  );
}

export function SectionSidebar({ sections, completedSections, currentSection, className }: SectionSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Calculate progress percentage
  const progressPercentage = sections.length > 0 
    ? Math.round((completedSections.length / sections.length) * 100)
    : 0;

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={cn('hidden lg:block', className)}>
        <div className="sticky top-24 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              Sections
            </h3>
            <span className="text-xs text-muted-foreground">
              {completedSections.length}/{sections.length}
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="mb-4">
            <div className="h-1.5 bg-accent rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {progressPercentage}% complete
            </p>
          </div>
          
          <SectionList
            sections={sections}
            completedSections={completedSections}
            currentSection={currentSection}
          />
        </div>
      </aside>

      {/* Mobile floating button and sheet */}
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              size="lg"
              className="rounded-full shadow-lg h-14 w-14 p-0"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <SheetHeader className="px-6 pt-6 pb-2">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-sm font-semibold text-foreground">
                  Sections
                </SheetTitle>
                <span className="text-xs text-muted-foreground">
                  {completedSections.length}/{sections.length}
                </span>
              </div>
            </SheetHeader>

            <div className="px-6 pb-6 space-y-4">
              
              {/* Progress bar */}
              <div>
                <div className="h-1.5 bg-accent rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {progressPercentage}% complete
                </p>
              </div>
              
              <SectionList
                sections={sections}
                completedSections={completedSections}
                currentSection={currentSection}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
