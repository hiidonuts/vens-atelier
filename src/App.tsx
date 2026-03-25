/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, useScroll, useTransform, AnimatePresence, useMotionValue, useSpring, LayoutGroup, useInView } from "motion/react";
import { ArrowRight, Menu, Plus, X, ArrowDown, ArrowUp, Github, Instagram, Linkedin, Sun, Moon, Terminal, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import React, { useRef, useState, useMemo, useEffect, useLayoutEffect } from "react";
import axios from "axios";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { WorkItem } from "./types";
import POSTERS_DATA from "./data/posters.json";

const POSTERS = POSTERS_DATA as WorkItem[];

gsap.registerPlugin(ScrollTrigger);

const CustomCursor = () => {
  const [cursorType, setCursorType] = useState<"default" | "view">("default");
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Faster springs for the main cursor to feel responsive
  const cursorX = useSpring(mouseX, { damping: 30, stiffness: 800, mass: 0.2 });
  const cursorY = useSpring(mouseY, { damping: 30, stiffness: 800, mass: 0.2 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".gallery-card") || target.closest("button") || target.closest("a")) {
        if (target.closest(".gallery-card")) {
          setCursorType("view");
        } else {
          setCursorType("default");
        }
      } else {
        setCursorType("default");
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseover", handleMouseOver);
    
    const style = document.createElement('style');
    style.innerHTML = `
      * { cursor: none !important; }
      input, textarea { cursor: text !important; }
    `;
    document.head.appendChild(style);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseover", handleMouseOver);
      document.head.removeChild(style);
    };
  }, []);

  return (
    <motion.div 
      className="fixed top-0 left-0 z-[1000] pointer-events-none flex items-start gap-4"
      style={{ x: cursorX, y: cursorY }}
    >
      {cursorType !== "caret" && (
        <svg 
          width="22" 
          height="22" 
          viewBox="0 0 22 22" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_2px_3px_rgba(0,0,0,0.3)]"
        >
          <path 
            d="M4.5 2.5V18.5L8.5 14.5L11.5 20.5L14 19L11 13H17L4.5 2.5Z" 
            fill="black" 
            stroke="white" 
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
    )}

      {cursorType === "caret" && (
        <div className="w-[1px] h-5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
      )}

      <AnimatePresence>
        {(cursorType === "view" || cursorType === "view-image") && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -10 }}
            className="bg-white text-black text-[9px] font-bold px-3 py-1.5 rounded-sm shadow-xl tracking-[0.2em] border border-black/10 whitespace-nowrap"
          >
            {cursorType === "view" ? "VIEW" : "VIEW PROJECT IMAGE"}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const ConditionalNoiseOverlay = () => {
  const [isGalleryInView, setIsGalleryInView] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      const gallerySection = document.querySelector('.gallery-section');
      const modalElement = document.querySelector('[class*="fixed inset-0 z-[100]"]');
      
      if (gallerySection) {
        const rect = gallerySection.getBoundingClientRect();
        setIsGalleryInView(rect.top < window.innerHeight && rect.bottom > 0);
      }
      
      setIsModalOpen(!!modalElement);
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    
    // Initial check
    handleScroll();
    
    // Also listen for modal changes
    const observer = new MutationObserver(handleScroll);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      observer.disconnect();
    };
  }, []);

  // Don't show noise overlay when in gallery or when modal is open
  if (isGalleryInView || isModalOpen) {
    return null;
  }

  return <div className="noise-overlay" />;
};

const VisitorCounter = () => {
  const [count, setCount] = useState<number | null>(null);
  const [isNewVisitor, setIsNewVisitor] = useState(false);

  // Generate or retrieve unique visitor ID
  const getVisitorId = () => {
    let visitorId = localStorage.getItem('visitor-id');
    if (!visitorId) {
      // Generate a more stable unique ID
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 9);
      visitorId = `visitor_${timestamp}_${random}`;
      localStorage.setItem('visitor-id', visitorId);
    }
    return visitorId;
  };

  const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const visitorId = getVisitorId();
        console.log('Visitor ID:', visitorId); // Debug log
        const response = await axios.get("/api/visitor-count", {
          headers: {
            'X-Visitor-ID': visitorId
          }
        });
        console.log('Response:', response.data); // Debug log
        setCount(response.data.count);
        setIsNewVisitor(response.data.isNewVisitor);
      } catch (error) {
        console.error("Failed to fetch visitor count");
      }
    };
    fetchCount();
  }, []);

  return (
    <div className="mb-8">
      <span className="text-[10px] font-bold tracking-[0.4em] uppercase opacity-40 block mb-2">
        Atelier Entry #{count?.toString().padStart(4, '0') || '----'}
      </span>
      <p className="text-[10px] font-medium opacity-60 uppercase tracking-widest">
        {isNewVisitor ? 'Welcome! You are the first' : `You are the ${count ? getOrdinal(count) : '--'} visitor`}
      </p>
    </div>
  );
};

interface StackTagProps {
  tech: string;
  key?: string;
}

const StackTag = ({ tech }: StackTagProps) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const getTechDescription = (t: string) => {
    const descriptions: Record<string, string> = {
      "React": "Component-based architecture for scalable UI.",
      "GSAP": "High-performance animations for complex sequences.",
      "Framer Motion": "Declarative animations for smooth interactions.",
      "TypeScript": "Type safety for robust and maintainable code.",
      "Tailwind": "Utility-first CSS for rapid, consistent styling.",
      "Three.js": "3D rendering for immersive web experiences.",
      "Next.js": "Server-side rendering and optimized performance."
    };
    return descriptions[t] || "Chosen for its reliability and performance.";
  };

  return (
    <div className="relative">
      <span 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="text-[9px] font-bold tracking-widest uppercase px-3 py-1.5 border border-current border-opacity-10 cursor-help hover:bg-current hover:text-[var(--bg)] transition-colors"
      >
        {tech}
      </span>
      <AnimatePresence>
        {isHovered && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full left-0 mb-3 w-48 p-3 bg-[var(--text)] text-[var(--bg)] text-[10px] font-medium leading-relaxed shadow-2xl z-50 pointer-events-none"
          >
            <div className="absolute bottom-0 left-4 translate-y-1/2 rotate-45 w-2 h-2 bg-[var(--text)]" />
            {getTechDescription(tech)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface PosterCardProps {
  poster: WorkItem;
  index: number;
  onOpenDetail: (project: WorkItem) => void;
}

const WorkCard: React.FC<PosterCardProps> = ({ poster, index, onOpenDetail }) => {
  const isProject = poster.type === "Projects";
  const archivalTimestamp = useMemo(() => {
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const day = Math.floor(Math.random() * 28) + 1;
    const month = months[Math.floor(Math.random() * 12)];
    const hour = Math.floor(Math.random() * 24).toString().padStart(2, '0');
    const minute = Math.floor(Math.random() * 60).toString().padStart(2, '0');
    return `${day} ${month} ${poster.year} · ${hour}:${minute} AM`;
  }, [poster.year]);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onClick={() => onOpenDetail(poster)}
      whileHover={{ 
        scale: 1.02,
        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)"
      }}
      transition={{ 
        duration: 0.4, 
        ease: [0.23, 1, 0.32, 1]
      }}
      className="gallery-card group relative flex-shrink-0 w-[75vw] md:w-[450px] lg:w-[500px] aspect-[3/4] max-h-[55vh] md:max-h-[60vh] overflow-hidden bg-[#111] cursor-pointer z-10 shadow-2xl flex flex-col"
    >
      {/* Image Container */}
      <div className={`relative overflow-hidden ${isProject ? 'h-[60%]' : 'h-full'}`}>
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1">
          <span className="text-[9px] font-bold tracking-widest uppercase bg-white text-black px-2 py-0.5 w-fit">
            {poster.year}
          </span>
          {!isProject && (
            <span className="text-[10px] font-medium tracking-tight text-white/60 italic font-serif">
              {poster.category}
            </span>
          )}
        </div>
        
        <motion.img 
          src={poster.image} 
          alt={poster.title}
          referrerPolicy="no-referrer"
          className={`w-full h-full object-cover transition-all duration-700 ease-out scale-105 group-hover:scale-100 ${!isProject ? 'grayscale group-hover:grayscale-0' : ''}`}
        />

        {!isProject && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-8 text-white">
            <motion.h3 className="text-3xl font-display font-bold tracking-tighter mb-2">
              {poster.title}
            </motion.h3>
            <p className="text-sm font-light leading-relaxed opacity-80 max-w-[280px]">
              {poster.description}
            </p>
            <div className="mt-6 flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase">
              View Detail <ArrowRight size={14} />
            </div>
          </div>
        )}
      </div>

      {isProject && (
        <div className="flex-1 p-8 flex flex-col bg-black text-white border-t border-white/10">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-3xl font-display font-bold tracking-tighter leading-none">
              {poster.title}
            </h3>
            <span className="text-[10px] font-bold tracking-widest uppercase opacity-40">
              {poster.category}
            </span>
          </div>
          
          <p className="text-sm font-light leading-relaxed text-white/60 mb-8 line-clamp-2">
            {poster.description}
          </p>

          <div className="mt-auto flex justify-between items-end">
            <div className="flex flex-wrap gap-2">
              {poster.stack?.map((tech) => (
                <span key={tech} className="text-[8px] font-bold tracking-widest uppercase px-2 py-1 border border-white/10 opacity-40">
                  {tech}
                </span>
              ))}
            </div>
            <div 
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetail(poster);
              }}
              className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-300"
            >
              <ArrowRight size={18} />
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

const TiltCard = ({ children }: { children: React.ReactNode }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [8, -8]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-8, 8]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        transformPerspective: 800,
      }}
      className="relative w-full h-full cursor-pointer"
    >
      {children}
    </motion.div>
  );
};

const LatestTicker = () => {
  const works = ["UI/UX", "MERN Stack", "Creative Dev"];
  return (
    <div className="overflow-hidden h-4">
      <motion.div
        animate={{ y: [0, -16, -32, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", times: [0, 0.33, 0.66, 1] }}
      >
        {works.map((work) => (
          <div key={work} className="h-4 text-xs font-display font-bold uppercase">
            {work}
          </div>
        ))}
      </motion.div>
    </div>
  );
};

const LocalTime = () => {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kuching",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      setTime(formatter.format(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="font-mono text-[10px] tracking-widest opacity-40">
      {time} KK/MY
    </span>
  );
};

const LastUpdated = () => {
  const timestamp = "25 MAR 2026, 14:42 (GMT +8";

  return (
    <span className="text-[10px] font-mono opacity-30 uppercase tracking-[0.2em]">
      Last Updated: {timestamp}
    </span>
  );
};

const MagneticCTA = ({ children }: { children: React.ReactNode }) => {
  const btnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = btn.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = (e.clientX - centerX) * 0.35;
      const deltaY = (e.clientY - centerY) * 0.35;

      gsap.to(btn, {
        x: deltaX,
        y: deltaY,
        duration: 0.4,
        ease: "power2.out"
      });
    };

    const handleMouseLeave = () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" });
    };

    btn.addEventListener("mousemove", handleMouseMove);
    btn.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      btn.removeEventListener("mousemove", handleMouseMove);
      btn.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div ref={btnRef} className="inline-block w-full">
      {children}
    </div>
  );
};

const TerminalHobbies = () => {
  const [lines, setLines] = useState<string[]>([]);
  const [isDone, setIsDone] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [timeTaken, setTimeTaken] = useState(0);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true });

  const fullLines = [
    "vens-atelier:~$ npm run hobbies.js",
    "  > playing guitar/piano",
    "  > creative arts/designs",
    "  > storywriting",
    "  > web development"
  ];

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [lines, history, input]);

  useEffect(() => {
    if (!isInView) return;

    let currentLineIndex = 0;
    let currentWordIndex = 0;
    let timer: NodeJS.Timeout;
    const startTime = performance.now();

    const type = () => {
      if (currentLineIndex < fullLines.length) {
        const currentFullLine = fullLines[currentLineIndex];
        const words = currentFullLine.split(" ");
        
        if (currentWordIndex < words.length) {
          setLines(prev => {
            const newLines = [...prev];
            if (newLines[currentLineIndex] === undefined) newLines[currentLineIndex] = "";
            newLines[currentLineIndex] = words.slice(0, currentWordIndex + 1).join(" ");
            return newLines;
          });
          currentWordIndex++;
          timer = setTimeout(type, 80 + Math.random() * 100);
        } else {
          currentLineIndex++;
          currentWordIndex = 0;
          timer = setTimeout(type, 300);
        }
      } else {
        const endTime = performance.now();
        setTimeTaken((endTime - startTime) / 1000);
        setTimeout(() => setIsDone(true), 500);
      }
    };

    timer = setTimeout(type, 1000);

    const cursorInterval = setInterval(() => {
      setCursorVisible(v => !v);
    }, 500);

    return () => {
      clearTimeout(timer);
      clearInterval(cursorInterval);
    };
  }, [isInView]);

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input.toLowerCase().trim();
    if (!cmd) return;

    let response = "";

    switch (cmd) {
      case "help":
        response = "Available: about, skills, contact, secret, clear";
        break;
      case "about":
        response = "I'm currently a third year student pursuing B.IT. Business Computing at University Malaysia Sabah";
        break;
      case "skills":
        response = "MERN Stack, Vite, TypeScript, GSAP, Framer Motion, UI/UX Design, SQL/NoSQL Databases, Git/Github";
        break;
      case "contact":
        response = "Gmail: venicevkx@gmail.com";
        break;
      case "secret":
        response = "📖 Addicted to reading fictional novels";
        break;
      case "clear":
        setHistory([]);
        setInput("");
        return;
      default:
        response = `Command not found: ${cmd}. Type 'help' for list.`;
    }

    setHistory(prev => [...prev, `vens-atelier:~$ ${input}`, response]);
    setInput("");
  };

  return (
    <div className="w-[350px] h-[300px] flex flex-col shrink-0 terminal-container">
      <div ref={containerRef} className="bg-[var(--bg)] border border-current border-opacity-10 rounded-lg p-4 font-mono text-[11px] w-full h-[230px] shadow-2xl transition-colors duration-500 flex flex-col">
        <div className="flex gap-1.5 mb-3 shrink-0">
          <div className="w-2 h-2 rounded-full bg-red-500/50" />
          <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
          <div className="w-2 h-2 rounded-full bg-green-500/50" />
        </div>
        <div 
          ref={scrollAreaRef}
          className="space-y-1 flex-1 overflow-y-auto no-scrollbar pr-2 scroll-smooth"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {lines.map((line, i) => (
            <div key={i} className={line.includes("vens-atelier") ? "text-emerald-500" : "opacity-70"}>
              {line}
              {!isDone && i === lines.length - 1 && (
                <span className={`inline-block w-1.5 h-3 bg-emerald-500 ml-1 align-middle transition-opacity duration-100 terminal-cursor ${cursorVisible ? 'opacity-100' : 'opacity-0'}`} />
              )}
            </div>
          ))}
          {isDone && (
            <>
              <div className="text-emerald-500/50 mt-2 mb-4">done in {timeTaken.toFixed(1)}s ✓</div>
              
              {history.map((h, i) => (
                <div key={i} className={h.includes("vens-atelier") ? "text-emerald-500" : "opacity-75"}>
                  {h}
                </div>
              ))}
              <form onSubmit={handleCommand} className="flex items-center">
                <span className="text-emerald-500 mr-2">vens-atelier:~$</span>
                <div className="relative flex-1 flex items-center">
                  <input 
                    type="text" 
                    id="terminal-input"
                    name="terminal-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="absolute inset-0 bg-transparent border-none outline-none text-[var(--text)] opacity-70 z-10 caret-transparent"
                    autoFocus
                  />
                  <div className="flex items-center pointer-events-none">
                    <span className="text-[var(--text)] opacity-70 whitespace-pre">{input}</span>
                    <span className={`w-1.5 h-3 bg-emerald-500 ml-0.5 transition-opacity duration-100 terminal-cursor ${cursorVisible ? 'opacity-100' : 'opacity-0'}`} />
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
      
      <div className="h-[70px] mt-4 px-1 flex flex-col gap-0.5">
        {isDone && (
          <>
            <div className="text-[10px] text-orange-500/60 uppercase tracking-[0.2em] font-mono">Available Commands</div>
            <div className="text-[10px] opacity-50 font-mono tracking-widest">help, about, skills, contact, secret, clear</div>
          </>
        )}
      </div>
    </div>
  );
};

const ProjectModal = ({ project, onClose }: { project: WorkItem | null, onClose: () => void }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isViewingImage, setIsViewingImage] = useState(false);
  const images = useMemo(() => {
    if (!project) return [];
    return project.images || [project.image];
  }, [project]);

  useEffect(() => {
    if (project) {
      document.body.style.overflow = 'hidden';
      setCurrentImageIndex(0);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [project]);

  if (!project) return null;

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 bg-black/90 backdrop-blur-xl"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-[var(--bg)] text-[var(--text)] border border-current border-opacity-10 w-full max-w-5xl h-full max-h-[90vh] overflow-hidden flex flex-col relative shadow-2xl transition-colors duration-500"
          onClick={e => e.stopPropagation()}
        >
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 z-20 w-10 h-10 rounded-full bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all duration-300"
          >
            <X size={20} />
          </button>

          {/* Image Section - Now on top */}
          <div 
            className="relative w-full h-[25vh] md:h-[30vh] overflow-hidden bg-black group/image cursor-zoom-in modal-image-container"
            onClick={() => setIsViewingImage(true)}
          >
            <img 
              src={images[currentImageIndex]} 
              alt={project.title} 
              className="w-full h-full object-cover opacity-60 group-hover/image:opacity-100 transition-opacity duration-500"
              referrerPolicy="no-referrer"
            />
            
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-[10px] font-bold tracking-[0.4em] uppercase opacity-20 group-hover/image:opacity-40 transition-opacity">Click to View</span>
            </div>

            {images.length > 1 && (
              <>
                <button 
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity hover:bg-white hover:text-black z-30"
                >
                  <ChevronLeft size={18} />
                </button>
                <button 
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity hover:bg-white hover:text-black z-30"
                >
                  <ChevronRight size={18} />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-30">
                  {images.map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentImageIndex ? 'bg-white w-4' : 'bg-white/30'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Full Screen Image View */}
          <AnimatePresence>
            {isViewingImage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-2xl"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsViewingImage(false);
                }}
              >
                <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[210] flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold tracking-[0.4em] uppercase opacity-40 text-white">Project</span>
                  <span className="text-xs font-display font-medium text-white tracking-widest">{project.title}</span>
                </div>

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsViewingImage(false);
                  }}
                  className="absolute top-8 right-8 z-[210] w-12 h-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all duration-300"
                >
                  <X size={24} />
                </button>

                <div className="relative w-full h-full flex items-center justify-center p-4 md:p-20" onClick={e => e.stopPropagation()}>
                  <AnimatePresence mode="wait">
                    <motion.img 
                      key={currentImageIndex}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      transition={{ type: "spring", damping: 25, stiffness: 200 }}
                      src={images[currentImageIndex]} 
                      alt={project.title} 
                      className="max-w-full max-h-full object-contain shadow-2xl"
                      referrerPolicy="no-referrer"
                    />
                  </AnimatePresence>

                  {images.length > 1 && (
                    <>
                      <button 
                        onClick={prevImage}
                        className="absolute left-8 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/5 text-white flex items-center justify-center border border-white/10 hover:bg-white hover:text-black transition-all duration-300 z-[210]"
                      >
                        <ChevronLeft size={32} />
                      </button>
                      <button 
                        onClick={nextImage}
                        className="absolute right-8 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/5 text-white flex items-center justify-center border border-white/10 hover:bg-white hover:text-black transition-all duration-300 z-[210]"
                      >
                        <ChevronRight size={32} />
                      </button>
                      
                      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-3 z-[210]">
                        {images.map((_, i) => (
                          <button
                            key={i}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentImageIndex(i);
                            }}
                            className={`w-2 h-2 rounded-full transition-all ${i === currentImageIndex ? 'bg-white w-8' : 'bg-white/20 hover:bg-white/40'}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Details Section - Now below */}
          <div className="flex-1 p-8 md:p-12 overflow-y-auto no-scrollbar flex flex-col scroll-smooth">
            <div className="mb-12">
              <span className="text-[10px] font-bold tracking-[0.4em] uppercase opacity-40 mb-4 block">
                {project.year} / {project.category}
              </span>
              <h2 className="text-4xl md:text-6xl font-display font-bold tracking-tighter leading-none mb-8">
                {project.title}
              </h2>
              <p className="text-lg font-light leading-relaxed opacity-60 max-w-3xl">
                {project.description}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
              <div>
                <span className="text-[10px] font-bold tracking-widest uppercase opacity-40 block mb-4">Stack</span>
                <div className="flex flex-wrap gap-2">
                  {project.stack?.map(tech => (
                    <StackTag key={tech} tech={tech} />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-auto pt-12 border-t border-current border-opacity-10 flex flex-col sm:flex-row gap-6">
              {project.demoUrl && (
                <a href={project.demoUrl} target="_blank" rel="noopener noreferrer" className="flex-1 bg-[var(--text)] text-[var(--bg)] text-center py-4 font-bold text-[11px] tracking-widest uppercase hover:bg-emerald-500 hover:text-white transition-colors">
                  Launch Project
                </a>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default function App() {
  const [selectedType, setSelectedType] = useState<"All" | "Posters" | "Projects">("Projects");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedProject, setSelectedProject] = useState<WorkItem | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (selectedProject) {
      lenisRef.current?.stop();
    } else {
      lenisRef.current?.start();
    }
  }, [selectedProject]);

  const handleThemeToggle = (e: React.MouseEvent) => {
    const x = e.clientX;
    const y = e.clientY;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    // @ts-ignore - View Transition API is still experimental in some TS versions
    if (!document.startViewTransition) {
      setIsDark(!isDark);
      document.documentElement.classList.toggle("dark", !isDark);
      return;
    }

    // @ts-ignore
    const transition = document.startViewTransition(() => {
      const nextTheme = !isDark;
      setIsDark(nextTheme);
      document.documentElement.classList.toggle("dark", nextTheme);
    });

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`,
      ];
      document.documentElement.animate(
        {
          clipPath: clipPath,
        },
        {
          duration: 700,
          easing: "cubic-bezier(0.645, 0.045, 0.355, 1)",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    });
  };

  const categories = useMemo(() => {
    const filteredByType = POSTERS.filter(p => p.type === "Projects");
    return ["All", ...new Set(filteredByType.map(p => p.category))];
  }, []);

  const filteredPosters = useMemo(() => {
    let items = POSTERS.filter(p => p.type === "Projects");
    if (selectedCategory !== "All") {
      items = items.filter(p => p.category === selectedCategory);
    }
    return items;
  }, [selectedCategory]);

  useLayoutEffect(() => {
    // Initial load animation
    gsap.fromTo(".gallery-card", 
      { y: 60, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, stagger: 0.1, ease: "power3.out", delay: 0.5 }
    );
  }, []);

  useEffect(() => {
    // Initialize Lenis
    const lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    lenisRef.current = lenis;

    // Sync ScrollTrigger with Lenis
    lenis.on('scroll', ScrollTrigger.update);

    const update = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(update);

    gsap.ticker.lagSmoothing(0);

    if (!headingRef.current) return;
    const chars = headingRef.current.querySelectorAll(".char");

    gsap.fromTo(chars,
      { y: 120, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1.2,
        stagger: 0.02,
        ease: "power4.out",
        delay: 0.5
      }
    );

    // Hide Sidebar Branding in Gallery Section
    ScrollTrigger.create({
      trigger: ".gallery-section",
      start: "top 50%",
      end: "bottom 50%",
      onEnter: () => gsap.to(".sidebar-branding", { opacity: 0, duration: 0.5 }),
      onLeave: () => gsap.to(".sidebar-branding", { opacity: 1, duration: 0.5 }),
      onEnterBack: () => gsap.to(".sidebar-branding", { opacity: 0, duration: 0.5 }),
      onLeaveBack: () => gsap.to(".sidebar-branding", { opacity: 1, duration: 0.5 }),
    });

    return () => {
      lenis.destroy();
      gsap.ticker.remove(update);
    };
  }, []);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  };

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const [scrollRange, setScrollRange] = useState(0);

  useLayoutEffect(() => {
    const updateRange = () => {
      if (scrollRef.current) {
        setScrollRange(scrollRef.current.scrollWidth - window.innerWidth);
      }
    };

    updateRange();
    window.addEventListener("resize", updateRange);
    return () => window.removeEventListener("resize", updateRange);
  }, [filteredPosters]);

  const xRaw = useTransform(scrollYProgress, [0, 1], [0, -scrollRange]);
  const x = useSpring(xRaw, { stiffness: 100, damping: 20, restDelta: 0.001 });

  const { scrollY } = useScroll();
  const parallaxY = useTransform(scrollY, [0, 2000], [0, 400]);

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    // Reset scroll to start of gallery
    if (containerRef.current) {
      const top = containerRef.current.offsetTop;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <main className="relative">
      <CustomCursor />
      <ConditionalNoiseOverlay />

      {/* Project Detail Modal */}
      <ProjectModal 
        project={selectedProject} 
        onClose={() => setSelectedProject(null)} 
      />

      {/* Parallax Background Element */}
      <motion.div 
        style={{ y: parallaxY }}
        className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 opacity-[0.03]"
      >
        <div className="absolute top-[10%] left-[5%] w-[40vw] h-[40vw] border-[1px] border-current rounded-full" />
        <div className="absolute top-[60%] right-[10%] w-[30vw] h-[30vw] border-[1px] border-current rotate-45" />
      </motion.div>

      {/* Sidebar Branding */}
      <div className="sidebar-branding fixed right-2 top-1/2 -translate-y-1/2 z-50 hidden lg:flex flex-col items-center gap-8">
        <div className="w-[1px] h-24 bg-current opacity-10" />
        <span className="text-[9px] font-bold tracking-[0.5em] uppercase [writing-mode:vertical-rl] opacity-30 text-center">
          EST. 2026 <br /> VEN'S ATELIER
        </span>
        <div className="w-[1px] h-24 bg-current opacity-10" />
      </div>

      <header className="fixed top-0 left-0 w-full z-50 px-6 py-8 flex justify-between items-end mix-blend-difference text-white pointer-events-none">
        <div className="flex flex-col pointer-events-auto">
          <span className="text-[10px] font-medium tracking-[0.2em] uppercase opacity-60">Ven's</span>
          <h1 className="text-xl font-display font-bold tracking-tighter">ATELIER.</h1>
        </div>
        <nav className="hidden md:flex items-center gap-12 text-[11px] font-medium tracking-widest uppercase pointer-events-auto">
          <button 
            onClick={handleThemeToggle} 
            className="hover:opacity-50 transition-opacity flex items-center gap-2"
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
            <span>{isDark ? 'Light' : 'Dark'}</span>
          </button>
          <button onClick={() => scrollToSection(heroRef)} className="hover:opacity-50 transition-opacity">About</button>
          <button onClick={() => scrollToSection(containerRef)} className="hover:opacity-50 transition-opacity">Gallery</button>
          <button onClick={() => scrollToSection(infoRef)} className="hover:opacity-50 transition-opacity">Contact</button>
        </nav>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden pointer-events-auto p-2"
        >
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-[45] bg-[var(--bg)] pt-32 px-6 md:hidden"
          >
            <nav className="flex flex-col gap-8 text-2xl font-display font-bold tracking-tighter">
              <button 
                onClick={() => { scrollToSection(heroRef); setIsMenuOpen(false); }}
                className="text-left"
              >
                About
              </button>
              <button 
                onClick={() => { scrollToSection(containerRef); setIsMenuOpen(false); }}
                className="text-left"
              >
                Gallery
              </button>
              <button 
                onClick={() => { scrollToSection(infoRef); setIsMenuOpen(false); }}
                className="text-left"
              >
                Contact
              </button>
              <div className="h-[1px] bg-current opacity-10 my-4" />
              <button 
                onClick={(e) => { handleThemeToggle(e); setIsMenuOpen(false); }}
                className="flex items-center gap-4 text-lg"
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
                <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
      
      <section ref={heroRef} className="min-h-screen flex flex-col justify-center px-6 pt-32 pb-20 overflow-hidden relative z-10">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <div className="flex flex-col">
              <motion.span 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.215, 0.61, 0.355, 1] }}
                className="text-[11px] font-bold tracking-[0.3em] uppercase opacity-30 mb-6 block"
              >
                Design x Development
              </motion.span>
              <h2 ref={headingRef} className="text-[12vw] lg:text-[7.5vw] font-display font-bold leading-[0.85] tracking-tighter uppercase mb-8">
                <span className="block overflow-hidden whitespace-nowrap">
                  {"WHERE".split("").map((char, i) => (
                    <span key={i} className="char inline-block">
                      {char}
                    </span>
                  ))}
                </span>
                <span className="block overflow-hidden whitespace-nowrap">
                  <span className="char italic font-serif font-normal lowercase pr-4 inline-block">ideas</span>
                  {"BECOME".split("").map((char, i) => (
                    <span key={i} className="char inline-block">
                      {char === " " ? "\u00A0" : char}
                    </span>
                  ))}
                </span>
                <span className="block overflow-hidden whitespace-nowrap">
                  {"ARTIFACTS.".split("").map((char, i) => (
                    <span key={i} className="char inline-block">
                      {char === " " ? "\u00A0" : char}
                    </span>
                  ))}
                </span>
              </h2>
              
              <div className="flex flex-col gap-8">
                <div className="flex items-start gap-4">
                  <svg width="48" height="1" className="mt-4 overflow-visible">
                    <motion.path
                      d="M 0 0.5 L 48 0.5"
                      fill="transparent"
                      stroke="currentColor"
                      strokeOpacity="0.2"
                      strokeWidth="1"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1, delay: 0.5, ease: "easeInOut" }}
                    />
                  </svg>
                  <div className="flex flex-col gap-4">
                    {["A living archive of creative, technical work", "and everything in between."].map((line, i) => (
                      <div key={i} className="overflow-hidden">
                        <motion.p
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.8, delay: 0.6 + i * 0.1, ease: [0.215, 0.61, 0.355, 1] }}
                          className="text-lg md:text-xl font-light leading-relaxed opacity-60"
                        >
                          {line}
                        </motion.p>
                      </div>
                    ))}
                  </div>
                </div>

                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 1, ease: [0.215, 0.61, 0.355, 1] }}
                  onClick={() => containerRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex items-center gap-4 text-[10px] font-bold tracking-[0.3em] uppercase border border-current border-opacity-10 w-fit px-8 py-4 hover:bg-[var(--text)] hover:text-[var(--bg)] transition-all duration-500 group"
                >
                  View Work <ArrowDown size={14} className="group-hover:translate-y-1 transition-transform" />
                </motion.button>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-5 relative">
            <TiltCard>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, delay: 0.2, ease: [0.215, 0.61, 0.355, 1] }}
                className="relative aspect-[4/5] w-full max-w-[420px] mx-auto overflow-hidden shadow-2xl"
              >
                <img 
                  src="/hero.png" 
                  alt="Featured Work"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 border-[20px] border-white/10 pointer-events-none" />
                <div 
                  style={{ transform: "translateZ(40px)" }}
                  className="absolute bottom-6 right-6 bg-[var(--bg)] p-4 flex flex-col gap-1 min-w-[140px] shadow-xl border border-current border-opacity-5"
                >
                  <span className="text-[9px] font-bold tracking-widest uppercase opacity-40">Top Skills</span>
                  <LatestTicker />
                </div>
              </motion.div>
            </TiltCard>
          </div>
        </div>
      </section>

      <div className="bg-black text-white py-4 overflow-hidden border-y border-white/10 relative z-10">
        <motion.div 
          animate={{ x: [0, -1000] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="flex whitespace-nowrap gap-20 text-[10px] font-bold tracking-[0.5em] uppercase"
        >
          <span>Visual Identity</span>
          <span>✦</span>
          <span>Creative Dev</span>
          <span>✦</span>
          <span>3D & WebGL</span>
          <span>✦</span>
          <span>Ven's Gallery</span>
          <span>✦</span>
          <span>Est. 2026</span>
          <span>✦</span>
          <span>Visual Identity</span>
          <span>✦</span>
          <span>Creative Dev</span>
          <span>✦</span>
          <span>3D & WebGL</span>
          <span>✦</span>
          <span>Ven's Gallery</span>
          <span>✦</span>
          <span>Est. 2026</span>
        </motion.div>
      </div>

      {/* Horizontal Scroll Section */}
      <section className="gallery-section relative h-[400vh] bg-black text-white z-10" ref={containerRef}>
        <div className="sticky top-0 h-screen flex flex-col justify-center overflow-hidden pt-32 pb-32">
          <div className="px-6 mb-8 md:mb-12 flex flex-col md:flex-row justify-between items-start md:items-end max-w-7xl mx-auto w-full gap-6 md:gap-8">
            <div>
              <span className="text-[10px] font-bold tracking-[0.4em] uppercase opacity-40 mb-2 block">
                Selected Works
              </span>
              <h2 className="text-5xl md:text-7xl font-display font-bold tracking-tighter mb-6">
                GALLERY.
              </h2>
              
              {/* Top Level Filters removed as per request */}

              {/* Second Level Filters (Now Primary) */}
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => handleCategoryChange(cat)}
                      className={`text-[10px] font-bold tracking-widest uppercase px-6 py-3 border transition-all duration-300 ${
                        selectedCategory === cat 
                          ? "bg-white text-black border-white" 
                          : "bg-transparent text-white/40 border-white/10 hover:border-white/30"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="hidden md:flex flex-col items-end gap-2">
              <span className="text-[10px] font-medium tracking-widest uppercase opacity-40">Scroll to Explore</span>
              <div className="w-32 h-[1px] bg-white/20 relative overflow-hidden">
                <motion.div 
                  style={{ scaleX: scrollYProgress }}
                  className="absolute inset-0 bg-white origin-left"
                />
              </div>
            </div>
          </div>

          <motion.div ref={scrollRef} style={{ x }} className="flex gap-8 px-6 md:px-[10vw] relative w-fit">
            <AnimatePresence mode="popLayout">
              {filteredPosters.map((poster, i) => (
                <WorkCard 
                  key={poster.id} 
                  poster={poster} 
                  index={i} 
                  onOpenDetail={(p) => setSelectedProject(p)}
                />
              ))}
            </AnimatePresence>
            
            {/* End Card */}
            <motion.div 
              data-flip-id="end-card"
              className="gallery-card flex-shrink-0 w-[75vw] md:w-[450px] lg:w-[500px] aspect-[3/4] max-h-[55vh] md:max-h-[60vh] flex flex-col items-center justify-center border border-white/10 group cursor-pointer"
            >
              <motion.div 
                whileHover={{ scale: 1.1, rotate: 90 }}
                className="w-20 h-20 rounded-full border border-white/20 flex items-center justify-center mb-6"
              >
                <Plus size={32} />
              </motion.div>
              <span className="text-sm font-display font-bold tracking-widest uppercase group-hover:opacity-50 transition-opacity">
                View All Works
              </span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Info Section */}
      <section ref={infoRef} className="py-32 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col gap-32">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-start">
            <div>
              <span className="text-[11px] font-bold tracking-[0.3em] uppercase opacity-30 mb-8 block">
                Philosophy
              </span>
              <h2 className="text-4xl md:text-6xl font-display font-bold leading-[0.9] tracking-tighter mb-10 uppercase">
                when obsession <span className="italic font-serif font-normal lowercase">becomes</span> craft.
              </h2>
              <p className="text-xl font-light leading-relaxed opacity-60 max-w-lg">
                This gallery is a record of decisions: design choices, technical solutions, creative experiments. 
                <br />
                Some are finished. Some are still evolving. 
                <br />
                All of them has a backstory when they were made.
              </p>
              <div className="mt-12">
                <blockquote className="text-s font-serif italic opacity-50 border-l-2 border-current pl-6 mb-4">
                  "One should either be a work of art, or wear a work of art." — Oscar Wilde
                </blockquote>
                <LastUpdated />
              </div>
            </div>
            <div className="flex flex-col justify-start gap-1 pt-13">
              <div className="flex flex-col md:flex-row gap-12 md:gap-20 items-start">
                <div className="flex flex-col gap-8">
                  <VisitorCounter />
                  <div>
                    <span className="text-[10px] font-bold tracking-widest uppercase block mb-4 opacity-40">Location</span>
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-medium opacity-60">
                        Kota Kinabalu,<br />
                        Sabah
                      </p>
                      <LocalTime />
                    </div>
                  </div>
                </div>

                <div className="h-px md:h-75 w-full md:w-px bg-current opacity-10" />

                <div className="flex flex-col gap-8">
                  <div>
                    <span className="text-[10px] font-bold tracking-widest uppercase block mb-4 opacity-40">Ven's Terminal!</span>
                    <TerminalHobbies />
                  </div>
                </div>
              </div>

              <MagneticCTA>
                <motion.a 
                  href="mailto:venicevkx@gmail.com"
                  className="flex items-center justify-between gap-4 text-2xl font-display font-bold tracking-tighter px-8 py-6 border border-current border-opacity-30 transition-all duration-500 group bg-[var(--bg)] text-[var(--text)] hover:bg-[var(--text)] hover:text-[var(--bg)] hover:shadow-lg"
                >
                  VENICEVKX@GMAIL.COM <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                </motion.a>
              </MagneticCTA>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-current border-opacity-5 flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
        <span className="text-[10px] font-bold tracking-[0.4em] uppercase opacity-30">
          © 2026 VEN'S ATELIER
        </span>
        <div className="flex gap-12 text-[10px] font-bold tracking-widest uppercase">
          <a href="https://www.instagram.com/venvkx/" target="_blank" className="flex items-center gap-2 hover:opacity-100 opacity-40 transition-opacity group">
            <Instagram size={12} className="group-hover:scale-110 transition-transform" /> Instagram
          </a>
          <a href="https://www.linkedin.com/in/venice-voo/" target="_blank" className="flex items-center gap-2 hover:opacity-100 opacity-40 transition-opacity group">
            <Linkedin size={12} className="group-hover:scale-110 transition-transform" /> LinkedIn
          </a>
          <a href="https://github.com/hiidonuts" target="_blank" className="flex items-center gap-2 hover:opacity-100 opacity-40 transition-opacity group">
            <Github size={12} className="group-hover:scale-110 transition-transform" /> GitHub
          </a>
        </div>
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2 text-[10px] font-bold tracking-[0.4em] uppercase opacity-30 hover:opacity-100 transition-opacity group"
        >
          Back to Top <ArrowUp size={14} className="group-hover:-translate-y-1 transition-transform" />
        </button>
      </footer>
    </main>
  );
}
