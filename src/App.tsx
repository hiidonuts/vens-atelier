import { motion, useScroll, useTransform, AnimatePresence, useMotionValue, useSpring, useInView } from "motion/react";
import { ArrowRight, Menu, X, ArrowDown, ArrowUp, Github, Instagram, Linkedin, Sun, Moon, Terminal, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import React, { useRef, useState, useMemo, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { WorkItem } from "./types";
import PROJECTS_DATA from "./data/projects.json";

const PROJECTS = PROJECTS_DATA as WorkItem[];

gsap.registerPlugin(ScrollTrigger);

const getCursorTypeFromTarget = (target: Element | null): "default" | "view" | "view-image" | "caret" => {
  if (!(target instanceof Element)) return "default";

  if (target.closest(".modal-image-container")) return "view-image";

  const isInModal =
    target.closest(".modal-container") ||
    target.closest(".modal-content") ||
    target.closest(".modal-scrollable") ||
    target.closest(".flex-1.overflow-y-auto") ||
    target.closest(".overflow-y-scroll");

  if (isInModal) return "default";
  if (target.closest(".gallery-card")) return "view";
  return "default";
};

const FrostedScrollbar = ({ disabled = false }: { disabled?: boolean }) => {
  const [thumb, setThumb] = useState({ height: 0, top: 0, visible: false });
  const draggingRef = useRef(false);
  const dragOffsetRef = useRef(0);

  const updateThumb = () => {
    const viewH = window.innerHeight;
    const docH = document.documentElement.scrollHeight;
    const maxScroll = Math.max(docH - viewH, 0);

    if (maxScroll <= 1) {
      setThumb({ height: 0, top: 0, visible: false });
      return;
    }

    const height = Math.max((viewH / docH) * viewH, 48);
    const top = (window.scrollY / maxScroll) * (viewH - height);
    setThumb({ height, top, visible: true });
  };

  useEffect(() => {
    updateThumb();
    window.addEventListener("scroll", updateThumb, { passive: true });
    window.addEventListener("resize", updateThumb);
    const observer = new ResizeObserver(updateThumb);
    observer.observe(document.documentElement);
    return () => {
      window.removeEventListener("scroll", updateThumb);
      window.removeEventListener("resize", updateThumb);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      const viewH = window.innerHeight;
      const docH = document.documentElement.scrollHeight;
      const maxScroll = Math.max(docH - viewH, 0);
      const trackTravel = Math.max(viewH - thumb.height, 1);
      const nextTop = Math.min(Math.max(e.clientY - dragOffsetRef.current, 0), trackTravel);
      window.scrollTo({ top: (nextTop / trackTravel) * maxScroll });
    };

    const onUp = () => {
      draggingRef.current = false;
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [thumb.height]);

  if (disabled || !thumb.visible) return null;

  return createPortal(
    <div
      className="frosted-scrollbar"
      aria-hidden="true"
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).dataset.thumb === "true") return;
        const viewH = window.innerHeight;
        const docH = document.documentElement.scrollHeight;
        const maxScroll = Math.max(docH - viewH, 0);
        const trackTravel = Math.max(viewH - thumb.height, 1);
        const nextTop = Math.min(Math.max(e.clientY - thumb.height / 2, 0), trackTravel);
        window.scrollTo({ top: (nextTop / trackTravel) * maxScroll });
      }}
    >
      <div
        className="frosted-scrollbar-thumb"
        data-thumb="true"
        style={{ height: thumb.height, transform: `translateY(${thumb.top}px)` }}
        onPointerDown={(e) => {
          e.stopPropagation();
          draggingRef.current = true;
          dragOffsetRef.current = e.clientY - thumb.top;
          document.body.style.userSelect = "none";
        }}
      />
    </div>,
    document.body
  );
};

const CustomCursor = () => {
  const [enabled, setEnabled] = useState(false);
  const [cursorType, setCursorType] = useState<"default" | "view" | "view-image" | "caret">("default");
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const cursorX = useSpring(mouseX, { damping: 30, stiffness: 800, mass: 0.2 });
  const cursorY = useSpring(mouseY, { damping: 30, stiffness: 800, mass: 0.2 });

  useEffect(() => {
    const pointerMedia = window.matchMedia("(pointer: fine)");
    const desktopMedia = window.matchMedia("(min-width: 1024px)");
    const sync = () => setEnabled(pointerMedia.matches && desktopMedia.matches);
    sync();
    pointerMedia.addEventListener("change", sync);
    desktopMedia.addEventListener("change", sync);
    return () => {
      pointerMedia.removeEventListener("change", sync);
      desktopMedia.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const pointer = { x: 0, y: 0, hasPoint: false };
    let rafId = 0;

    const syncCursorType = () => {
      rafId = 0;
      if (!pointer.hasPoint) return;
      const el = document.elementFromPoint(pointer.x, pointer.y);
      setCursorType(getCursorTypeFromTarget(el));
    };

    const scheduleSync = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(syncCursorType);
    };

    const handleMouseMove = (e: MouseEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.hasPoint = true;
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      scheduleSync();
    };

    const handleScrollbarInteraction = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "HTML" || target.tagName === "BODY") {
        setCursorType("default");
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleScrollbarInteraction);
    // Cards move under a still cursor during page/gallery scroll — re-hit-test.
    window.addEventListener("scroll", scheduleSync, { passive: true, capture: true });
    window.addEventListener("wheel", scheduleSync, { passive: true });
    window.addEventListener("resize", scheduleSync);
    
    const style = document.createElement('style');
    style.innerHTML = `
      * { cursor: none !important; }
      input, textarea { cursor: text !important; }
      /* Force cursor hidden on all scrollbar pseudo-elements */
      *::-webkit-scrollbar, *::-webkit-scrollbar-track, *::-webkit-scrollbar-thumb, *::-webkit-scrollbar-corner, *::-webkit-scrollbar-resizer {
        cursor: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleScrollbarInteraction);
      window.removeEventListener("scroll", scheduleSync, true);
      window.removeEventListener("wheel", scheduleSync);
      window.removeEventListener("resize", scheduleSync);
      if (rafId) cancelAnimationFrame(rafId);
      document.head.removeChild(style);
    };
  }, [enabled]);

  if (!enabled) return null;

  return createPortal(
    <motion.div 
      className="fixed top-0 left-0 z-[99999] pointer-events-none flex items-start gap-4"
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
        <div className="w-[1px] h-5 bg-[var(--accent)]" />
      )}

      <AnimatePresence>
        {(cursorType === "view" || cursorType === "view-image") && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -10 }}
            className="bg-white text-black text-[9px] font-bold px-3 py-1.5 rounded-sm shadow-xl tracking-[0.2em] border border-black/10 whitespace-nowrap"
          >
            {cursorType === "view" ? "VIEW" : "CLICK TO VIEW"}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>,
    document.body
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
    handleScroll();
  
    const observer = new MutationObserver(handleScroll);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      observer.disconnect();
    };
  }, []);

  if (isGalleryInView || isModalOpen) {
    return null;
  }

  return <div className="noise-overlay" />;
};

const VisitorCounter = () => {
  const [count, setCount] = useState<number | null>(null);
  const [isNewVisitor, setIsNewVisitor] = useState(false);

  const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  useEffect(() => {
    const fetchCount = async () => {
      try {
        // Let the backend handle session cookies automatically
        const response = await axios.get("/api/visitor-count", {
          withCredentials: true // Enable cookie handling
        });
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
        {count === 1 ? 'Welcome! You are the first' : `You are the ${count ? getOrdinal(count) : '--'} visitor.`}
      </p>
    </div>
  );
};

interface StackTagProps {
  tech: string;
  key?: string;
}

const StackTag = ({ tech }: StackTagProps) => {
  return (
    <span className="text-[9px] font-bold tracking-widest uppercase px-3 py-1.5 border border-current border-opacity-10">
      {tech}
    </span>
  );
};

interface PosterCardProps {
  poster: WorkItem;
  index: number;
  onOpenDetail: (project: WorkItem) => void;
}

const WorkCard: React.FC<PosterCardProps> = ({ poster, index, onOpenDetail }) => {
  const number = String(index + 1).padStart(2, "0");

  return (
    <div 
      onClick={() => onOpenDetail(poster)}
      className="gallery-card group relative flex-shrink-0 w-[72vw] md:w-[420px] lg:w-[480px] aspect-[3/4] max-h-[58vh] md:max-h-[62vh] overflow-hidden bg-[#111] cursor-pointer z-10"
    >
      <div className="relative w-full h-full overflow-hidden">
        <span className="absolute top-5 left-5 z-10 font-mono text-[11px] tracking-[0.2em] text-white/55">
          {number}
        </span>

        <img 
          src={poster.image} 
          alt={poster.title}
          loading={index < 3 ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover grayscale transition-[filter] duration-500 ease-out will-change-[filter] group-hover:grayscale-0"
        />

        <div className="absolute inset-x-0 bottom-0 p-6 md:p-8 bg-gradient-to-t from-black/75 via-black/25 to-transparent">
          <h3 className="text-2xl md:text-3xl font-display font-bold tracking-tighter leading-none">
            {poster.title}
          </h3>
          <p className="mt-3 text-[10px] font-medium tracking-[0.22em] uppercase text-white/50">
            {poster.category}
          </p>
        </div>
      </div>
    </div>
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

const GREETINGS = ["Hello!", "Grüezi!", "你好!"];

const GreetingTypewriter = () => {
  const [text, setText] = useState("");
  const [greetingIndex, setGreetingIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      setText(GREETINGS[0]);
      return;
    }

    const current = GREETINGS[greetingIndex];
    // Slower, even cadence — hold longer on completed words
    const progress = current.length === 0 ? 0 : text.length / current.length;
    const typingSpeed = isDeleting
      ? 55 + progress * 25
      : 110 + (1 - progress) * 50;
    const pauseAtFull = 2200;
    const pauseAtEmpty = 400;

    let timeout: ReturnType<typeof setTimeout>;

    if (!isDeleting && text === current) {
      timeout = setTimeout(() => setIsDeleting(true), pauseAtFull);
    } else if (isDeleting && text === "") {
      timeout = setTimeout(() => {
        setIsDeleting(false);
        setGreetingIndex((i) => (i + 1) % GREETINGS.length);
      }, pauseAtEmpty);
    } else {
      timeout = setTimeout(() => {
        const nextLen = text.length + (isDeleting ? -1 : 1);
        setText(current.slice(0, nextLen));
      }, typingSpeed);
    }

    return () => clearTimeout(timeout);
  }, [text, isDeleting, greetingIndex, reduceMotion]);

  const isChinese = GREETINGS[greetingIndex] === "你好!";

  return (
    <h2
      className={`text-[16vw] sm:text-[13vw] lg:text-[8vw] font-normal leading-[0.9] tracking-tight mb-0 min-h-[1.1em] text-left ${
        isChinese ? "font-chinese" : "font-serif italic"
      }`}
    >
      <span>{text}</span>
      {!reduceMotion && (
        <span
          aria-hidden
          className="inline-block w-[0.08em] h-[0.75em] ml-[0.06em] align-[-0.05em] bg-current opacity-70"
          style={{ animation: "typeCaret 1s steps(1) infinite" }}
        />
      )}
      <span className="sr-only">Hello!, Grüezi!, 你好!</span>
    </h2>
  );
};

const LastUpdated = () => {
  const timestamp = "13 NOV 2026 2:45 PM (GMT +8)";

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
    <div ref={btnRef} className="inline-block w-fit max-w-full">
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
        response = "I'm currently a final year student pursuing B.IT. Business Computing at University Malaysia Sabah";
        break;
      case "skills":
        response = "AI Development, MERN Stack, TypeScript, Game Development, UI/UX Design";
        break;
      case "contact":
        response = "Gmail: venvkx@gmail.com";
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
    <div className="w-full max-w-[350px] flex flex-col shrink-0 terminal-container">
      <div ref={containerRef} className="bg-[var(--bg)] border border-current border-opacity-10 rounded-lg p-4 font-mono text-[11px] w-full h-[230px] transition-colors duration-500 flex flex-col">
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
            <div key={i} className={line.includes("vens-atelier") ? "text-[var(--email)]" : "opacity-70"}>
              {line}
              {!isDone && i === lines.length - 1 && (
                <span className={`inline-block w-1.5 h-3 bg-[var(--email)] ml-1 align-middle transition-opacity duration-100 terminal-cursor ${cursorVisible ? 'opacity-100' : 'opacity-0'}`} />
              )}
            </div>
          ))}
          {isDone && (
            <>
              <div className="text-[var(--email)]/50 mt-2">done in {timeTaken.toFixed(1)}s ✓</div>
              <div className="opacity-40 mb-4">type help for commands</div>
              
              {history.map((h, i) => (
                <div key={i} className={h.includes("vens-atelier") ? "text-[var(--email)]" : "opacity-75"}>
                  {h}
                </div>
              ))}
              <form onSubmit={handleCommand} className="flex items-center">
                <span className="text-[var(--email)] mr-2">vens-atelier:~$</span>
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
                    <span className={`w-1.5 h-3 bg-[var(--email)] ml-0.5 transition-opacity duration-100 terminal-cursor ${cursorVisible ? 'opacity-100' : 'opacity-0'}`} />
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
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

  useEffect(() => {
    if (!images.length) return;
    const preload = (src: string) => {
      const img = new Image();
      img.src = src;
    };
    preload(images[currentImageIndex]);
    if (images.length > 1) {
      preload(images[(currentImageIndex + 1) % images.length]);
      preload(images[(currentImageIndex - 1 + images.length) % images.length]);
    }
  }, [images, currentImageIndex]);

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
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 bg-black/90 backdrop-blur-xl modal-container"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-[var(--bg)] text-[var(--text)] border border-current border-opacity-10 w-full max-w-5xl h-full max-h-[90vh] flex flex-col relative shadow-2xl transition-colors duration-500 modal-content"
          onClick={e => e.stopPropagation()}
        >
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 z-20 w-10 h-10 rounded-full bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all duration-300"
          >
            <X size={20} />
          </button>

          <div 
            className="relative w-full h-[25vh] md:h-[30vh] overflow-hidden bg-black group/image cursor-zoom-in modal-image-container"
            onClick={() => setIsViewingImage(true)}
          >
            <AnimatePresence initial={false}>
              <motion.img
                key={currentImageIndex}
                src={images[currentImageIndex]}
                alt={project.title}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-black/40 group-hover/image:bg-transparent transition-colors duration-500 pointer-events-none" />

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
                  <AnimatePresence initial={false}>
                    <motion.img 
                      key={currentImageIndex}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                      src={images[currentImageIndex]} 
                      alt={project.title} 
                      className="absolute max-w-full max-h-full object-contain shadow-2xl"
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

          <div 
            className="flex-1 p-8 md:p-12 overflow-y-scroll flex flex-col modal-scrollable" 
            style={{ height: '60vh' }}
            onWheel={(e) => e.stopPropagation()}
          >
            <div className="mb-12 max-w-4xl">
              <span className="text-[10px] font-bold tracking-[0.4em] uppercase opacity-40 mb-4 block">
                {project.year} / {project.category}
              </span>
              <h2 className="text-4xl md:text-6xl font-display font-bold tracking-tighter leading-none mb-8">
                {project.title}
              </h2>
              <p className="text-lg font-light leading-relaxed opacity-70">
                {project.description}
              </p>
            </div>

            <div className="mb-12 max-w-4xl">
              <span className="text-[10px] font-bold tracking-widest uppercase opacity-40 block mb-4">Stack</span>
              <div className="flex flex-wrap gap-2">
                {project.stack?.map(tech => (
                  <StackTag key={tech} tech={tech} />
                ))}
              </div>
            </div>

            {project.demoUrl && (
            <div className="pt-12 border-t border-current border-opacity-10 flex flex-col sm:flex-row gap-6">
              <a href={project.demoUrl} target="_blank" rel="noopener noreferrer" className="flex-1 bg-[var(--accent)] text-[var(--bg)] text-center py-4 font-bold text-[11px] tracking-widest uppercase hover:opacity-85 transition-opacity">
                Launch Project
              </a>
            </div>
          )}
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
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
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

    if (!document.startViewTransition) {
      setIsDark(!isDark);
      document.documentElement.classList.toggle("dark", !isDark);
      return;
    }

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
    const filteredByType = PROJECTS.filter(p => p.type === "Projects");
    const present = [...new Set(filteredByType.map(p => p.category))];
    const preferred = ["AI", "Games & Graphics", "Web Experiences", "Commerce", "Apps & Tools"];
    const ordered = [
      ...preferred.filter((cat) => present.includes(cat)),
      ...present.filter((cat) => !preferred.includes(cat)),
    ];
    return ["All", ...ordered];
  }, []);

  const filteredPosters = useMemo(() => {
    let items = PROJECTS.filter(p => p.type === "Projects");
    if (selectedCategory !== "All") {
      items = items.filter(p => p.category === selectedCategory);
    }
    return items;
  }, [selectedCategory]);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    lenisRef.current = lenis;

    lenis.on('scroll', ScrollTrigger.update);

    const update = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(update);

    gsap.ticker.lagSmoothing(0);

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

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  };

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const [scrollRange, setScrollRange] = useState(0);
  const [galleryHeight, setGalleryHeight] = useState<number | null>(null);

  const updateGalleryMetrics = () => {
    if (!scrollRef.current) return;

    const range = Math.max(0, scrollRef.current.scrollWidth - window.innerWidth);
    const viewH = window.innerHeight;
    setScrollRange(range);

    // Scale vertical travel with horizontal content so short filters don't feel endless.
    if (range <= 8) {
      setGalleryHeight(viewH);
      return;
    }

    const travel = Math.min(Math.max(range * 0.9, viewH * 0.7), viewH * 3);
    setGalleryHeight(viewH + travel);
  };

  useLayoutEffect(() => {
    updateGalleryMetrics();
    window.addEventListener("resize", updateGalleryMetrics);
    return () => window.removeEventListener("resize", updateGalleryMetrics);
  }, [filteredPosters]);

  const xRaw = useTransform(scrollYProgress, [0, 1], [0, -scrollRange]);
  const x = useSpring(xRaw, { stiffness: 140, damping: 28, restDelta: 0.001 });

  const handleCategoryChange = (cat: string) => {
    if (cat === selectedCategory) return;
    setSelectedCategory(cat);
    if (containerRef.current) {
      const top = containerRef.current.offsetTop;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <main className="relative">
      <CustomCursor />
      <FrostedScrollbar disabled={!!selectedProject} />
      <ConditionalNoiseOverlay />

      <ProjectModal 
        project={selectedProject} 
        onClose={() => setSelectedProject(null)} 
      />

      <div className="sidebar-branding fixed right-3 top-1/2 -translate-y-1/2 z-50 hidden xl:flex flex-col items-center gap-6 pointer-events-none">
        <div className="w-px h-16 bg-current opacity-[0.06]" />
        <span className="text-[8px] font-medium tracking-[0.45em] uppercase [writing-mode:vertical-rl] opacity-[0.18] text-center">
          EST. 2026 · VEN'S ATELIER
        </span>
        <div className="w-px h-16 bg-current opacity-[0.06]" />
      </div>

      <header className="fixed top-0 left-0 w-full z-50 px-6 py-8 flex justify-between items-end mix-blend-difference text-white pointer-events-none">
        <div className="flex flex-col pointer-events-auto">
          <span className="text-[10px] font-medium tracking-[0.2em] uppercase opacity-60">Ven's</span>
          <h1 className="text-xl font-display font-bold tracking-tighter">ATELIER.</h1>
        </div>
        <nav className="hidden md:flex items-center gap-10 text-[13px] font-medium tracking-widest uppercase pointer-events-auto">
          <button 
            onClick={handleThemeToggle} 
            className="hover:opacity-50 transition-opacity flex items-center gap-2"
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
            <span>{isDark ? 'Light' : 'Dark'}</span>
          </button>
          <button onClick={() => scrollToSection(heroRef)} className="hover:opacity-50 transition-opacity">Home</button>
          <button onClick={() => scrollToSection(containerRef)} className="hover:opacity-50 transition-opacity">Projects</button>
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
                Home
              </button>
              <button 
                onClick={() => { scrollToSection(containerRef); setIsMenuOpen(false); }}
                className="text-left"
              >
                Projects
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
        <div className="w-full flex justify-center">
          <div className="flex flex-col lg:flex-row items-center lg:items-stretch gap-10 lg:gap-12 xl:gap-16 w-fit max-w-full">
            <div className="flex flex-col text-left w-full max-w-md lg:max-w-lg shrink-0 lg:justify-center gap-8 lg:gap-10">
              <div>
                <motion.span 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: [0.215, 0.61, 0.355, 1] }}
                  className="text-[13px] font-medium tracking-widest uppercase opacity-30 mb-6 block"
                >
                  Design & Development
                </motion.span>
                <GreetingTypewriter />
              </div>

              <div className="flex items-start gap-4">
                <svg width="48" height="1" className="mt-4 overflow-visible shrink-0">
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
                <div className="flex flex-col gap-3">
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6, ease: [0.215, 0.61, 0.355, 1] }}
                    className="text-lg md:text-xl font-light leading-relaxed opacity-60"
                  >
                    Welcome to Venice's project gallery!
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.75, ease: [0.215, 0.61, 0.355, 1] }}
                    className="text-lg md:text-xl font-light leading-relaxed opacity-60"
                  >
                    I build apps and games as a hobby.
                  </motion.p>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1, ease: [0.215, 0.61, 0.355, 1] }}
                className="flex flex-wrap items-center gap-4 sm:gap-8"
              >
                <button
                  onClick={() => containerRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex items-center gap-4 text-[13px] font-medium tracking-widest uppercase border border-current border-opacity-10 w-fit px-8 py-4 hover:bg-[var(--text)] hover:text-[var(--bg)] transition-all duration-500 group"
                >
                  View More <ArrowDown size={14} className="group-hover:translate-y-1 transition-transform" />
                </button>
                <a
                  href="/Venice%20Voo_Resume.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[13px] font-medium tracking-widest uppercase opacity-50 hover:opacity-100 transition-opacity ml-2 sm:ml-0"
                >
                  Resume <ExternalLink size={14} />
                </a>
              </motion.div>
            </div>
            
            <div className="relative shrink-0 w-full max-w-[420px]">
              <TiltCard>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1.2, delay: 0.2, ease: [0.215, 0.61, 0.355, 1] }}
                  className="relative aspect-[4/5] w-full overflow-hidden shadow-2xl"
                >
                  <img 
                    src="/hero.jpg" 
                    alt="Featured Work"
                    fetchPriority="high"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 border-[12px] md:border-[20px] border-white/10 pointer-events-none" />
                </motion.div>
              </TiltCard>
            </div>
          </div>
        </div>
      </section>

      <div
        className="py-3 overflow-hidden relative z-10"
        style={{ backgroundColor: "var(--marquee-bg)", color: "var(--marquee-fg)" }}
      >
        <div className="marquee-track">
          {[0, 1].map((copy) => (
            <div
              key={copy}
              className="flex shrink-0 whitespace-nowrap gap-16 pr-16 text-[10px] font-medium tracking-[0.45em] uppercase"
              aria-hidden={copy === 1}
            >
              <span>Ven's Atelier</span>
              <span aria-hidden>·</span>
              <span>Est. 2026</span>
              <span aria-hidden>·</span>
              <span>Full Stack</span>
              <span aria-hidden>·</span>
              <span>AI/ML</span>
              <span aria-hidden>·</span>
              <span>Game Dev.</span>
              <span aria-hidden>·</span>
              <span>Ven's Atelier</span>
              <span aria-hidden>·</span>
              <span>Est. 2026</span>
              <span aria-hidden>·</span>
              <span>Full Stack</span>
              <span aria-hidden>·</span>
              <span>AI/ML</span>
              <span aria-hidden>·</span>
              <span>Game Dev.</span>
              <span aria-hidden>·</span>
            </div>
          ))}
        </div>
      </div>

      <section
        className="gallery-section relative bg-[#0C0C0B] text-white z-10"
        ref={containerRef}
        style={{ height: galleryHeight ?? "250vh" }}
      >
        <div className="sticky top-0 h-screen flex flex-col justify-center overflow-hidden pt-24 pb-16 md:pt-32 md:pb-28">
          <div className="px-6 mb-6 md:mb-10 flex flex-col md:flex-row justify-between items-start md:items-end max-w-7xl mx-auto w-full gap-4 md:gap-8">
            <div className="w-full">
              <h2 className="text-4xl sm:text-5xl md:text-7xl font-display font-bold tracking-tighter mb-6 md:mb-8">
                PROJECTS.
              </h2>
              
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-2 md:gap-x-6 md:gap-y-3 max-w-full">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => handleCategoryChange(cat)}
                      data-active={selectedCategory === cat}
                      className="filter-tab text-[13px] font-medium tracking-widest uppercase"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="hidden md:flex flex-col items-center gap-2">
              <span className="text-[10px] font-medium tracking-widest uppercase opacity-40">(Scroll)</span>
              <div className="w-28 h-px bg-white/15 relative overflow-hidden">
                <motion.div 
                  style={{ scaleX: scrollYProgress }}
                  className="absolute inset-0 bg-white/70 origin-left"
                />
              </div>
            </div>
          </div>

          <motion.div ref={scrollRef} style={{ x }} className="relative w-fit px-6 md:px-[10vw]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={selectedCategory}
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -28 }}
                transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                className="flex gap-6 md:gap-8 w-fit"
                onAnimationComplete={updateGalleryMetrics}
              >
                {filteredPosters.map((poster, i) => (
                  <WorkCard 
                    key={poster.id} 
                    poster={poster} 
                    index={i} 
                    onOpenDetail={(p) => setSelectedProject(p)}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      <section
        ref={infoRef}
        className={`py-20 md:py-36 px-6 relative ${isTerminalOpen ? "z-20" : "z-10"}`}
      >
        <div className="max-w-7xl mx-auto flex flex-col gap-16 md:gap-32">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-16 items-start">
            <div className="md:col-span-7 flex flex-col">
              <span className="text-[11px] font-bold tracking-[0.3em] uppercase opacity-30 mb-8 block">
                Contact
              </span>
              <h3 className="text-3xl md:text-4xl font-display font-bold tracking-tighter leading-none mb-8">
                Let's make something worth keeping.
              </h3>
              <MagneticCTA>
                <motion.a 
                  href="mailto:venvkx@gmail.com"
                  className="inline-flex items-center gap-3 sm:gap-4 text-xl sm:text-2xl md:text-4xl font-display font-bold tracking-tighter text-[var(--email)] hover:opacity-70 transition-opacity break-all"
                >
                  venvkx@gmail.com
                  <ArrowRight className="shrink-0" size={24} />
                </motion.a>
              </MagneticCTA>

              <blockquote className="mt-12 font-serif italic opacity-50 border-l-2 border-[var(--accent)] pl-6">
                "One should either be a work of art, or wear a work of art." — Oscar Wilde
              </blockquote>
              <div className="mt-12">
                <LastUpdated />
              </div>
            </div>

            <div className="md:col-span-5 relative flex flex-col">
              <VisitorCounter />
              <button
                type="button"
                onClick={() => setIsTerminalOpen((open) => !open)}
                className="flex items-center gap-3 text-[10px] font-bold tracking-[0.3em] uppercase opacity-40 hover:opacity-80 transition-opacity"
                aria-expanded={isTerminalOpen}
              >
                <Terminal size={12} />
                {isTerminalOpen ? "Close Terminal" : "Terminal"}
              </button>

              <AnimatePresence>
                {isTerminalOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                    className="absolute left-0 top-full z-30 mt-6 w-full max-w-[350px] bg-[var(--bg)] pb-4"
                  >
                    <TerminalHobbies />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-12 px-6 border-t border-current border-opacity-5 flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8 relative z-10">
        <span className="text-[10px] font-bold tracking-[0.4em] uppercase opacity-30">
          © 2026 VEN'S ATELIER
        </span>
        <div className="flex flex-wrap justify-center gap-6 md:gap-12 text-[10px] font-bold tracking-widest uppercase">
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
