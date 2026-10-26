
import { Box } from "@mui/material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  content: string;
}

export default function MarkdownMessage({ content }: Props) {
  return (
    <Box
      sx={{
        fontSize: "0.875rem",
        lineHeight: 1.7,
        overflowWrap: "anywhere",

        "& p": {
          my: 1,
        },

        "& h1, & h2, & h3": {
          color: "#101D33",
          fontWeight: 800,
          mt: 2,
          mb: 1,
          lineHeight: 1.4,
        },

        "& h1": { fontSize: "1.2rem" },
        "& h2": { fontSize: "1.1rem" },
        "& h3": { fontSize: "1rem" },

        "& strong": {
          fontWeight: 700,
        },

        "& ul, & ol": {
          pl: 3,
          my: 1,
        },

        "& li": {
          mb: 0.5,
        },

        "& table": {
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "0.8rem",
        },

        "& th": {
          backgroundColor: "#F3F6FA",
          fontWeight: 700,
          color: "#101D33",
        },

        "& th, & td": {
          border: "1px solid #E2E8F0",
          padding: "8px 12px",
          textAlign: "left",
        },

        "& tr:nth-of-type(even)": {
          backgroundColor: "#F8FAFC",
        },

        "& hr": {
          border: 0,
          borderTop: "1px solid #E2E8F0",
          my: 2,
        },

        "& a": {
          color: "#079447",
          textDecoration: "underline",
        },

        "& blockquote": {
          borderLeft: "3px solid #079447",
          pl: 2,
          ml: 0,
          color: "#64748B",
        },
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <Box sx={{ overflowX: "auto", my: 2 }}>
              <table>{children}</table>
            </Box>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </Box>
  );
}
