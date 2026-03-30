import { ChatInterface } from "@/components/chat/chat-interface";

export const metadata = {
  title: "ByteReaper - AI Developer Assistant",
  description: "Chat with ByteReaper AI to analyze code, search the web, and get developer assistance.",
};

export default function AnalyzePage() {
  return <ChatInterface />;
}