"use client";

import { motion } from "framer-motion";
import { Link2, Cpu, FileOutput, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: Link2,
    title: "Paste Repository URL",
    description: "Enter any public GitHub repository URL to start the analysis.",
  },
  {
    icon: Cpu,
    title: "AI Analysis",
    description: "Our AI examines your code structure, patterns, and potential issues.",
  },
  {
    icon: FileOutput,
    title: "Get Report",
    description: "Receive a detailed report with prioritized findings and suggestions.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-20">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Get insights about your code in three simple steps.
          </p>
        </motion.div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-4">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              className="flex items-center gap-4"
            >
              <div className="flex flex-col items-center text-center max-w-xs">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <step.icon className="h-8 w-8 text-primary" />
                </div>
                <div className="text-sm text-primary font-medium mb-2">
                  Step {index + 1}
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">
                  {step.description}
                </p>
              </div>
              
              {index < steps.length - 1 && (
                <ArrowRight className="hidden md:block h-6 w-6 text-muted-foreground mx-4" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}