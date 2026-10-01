import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Menu, X } from 'lucide-react';

interface FloatingMenuButtonProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface Position {
  x: number;
  y: number;
}

const STORAGE_KEY = 'finanfly_floating_menu_position_v2';
const BUTTON_SIZE = 44; // 44px - alinhado ao avatar (40px) com toque confortável

export const FloatingMenuButton: React.FC<FloatingMenuButtonProps> = ({
  isOpen,
  onToggle
}) => {
  // Posição padrão inicial: abaixo do círculo com as iniciais do usuário no canto superior direito
  const getDefaultPosition = (): Position => {
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 390;
    // Header possui px-4 (16px da borda direita) e avatar w-10 (40px)
    const defaultX = Math.max(8, screenWidth - BUTTON_SIZE - 14);
    return {
      x: defaultX,
      y: 74 // Logo abaixo da barra de menu superior fixa
    };
  };

  const [position, setPosition] = useState<Position>(() => {
    const defaultPos = getDefaultPosition();
    if (typeof window === 'undefined') return defaultPos;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          const safeX = Math.max(8, Math.min(window.innerWidth - BUTTON_SIZE - 8, parsed.x));
          const safeY = Math.max(50, Math.min(window.innerHeight - BUTTON_SIZE - 20, parsed.y));
          return { x: safeX, y: safeY };
        }
      }
    } catch {
      // Ignorar erros de storage
    }
    return defaultPos;
  });

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragInfoRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    buttonStartX: number;
    buttonStartY: number;
    hasMoved: boolean;
  } | null>(null);

  const lastToggleTimeRef = useRef<number>(0);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Executa o toggle com proteção anti-duplo clique / anti-duplo disparo de touch e synthetic click
  const triggerToggle = useCallback(() => {
    const now = Date.now();
    if (now - lastToggleTimeRef.current < 350) {
      return; // Ignora evento sintético duplicado em sequência
    }
    lastToggleTimeRef.current = now;
    onToggle();
  }, [onToggle]);

  // Manter o botão dentro da tela se a janela for redimensionada ou rotacionada
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => {
        const safeX = Math.max(8, Math.min(window.innerWidth - BUTTON_SIZE - 8, prev.x));
        const safeY = Math.max(50, Math.min(window.innerHeight - BUTTON_SIZE - 20, prev.y));
        return { x: safeX, y: safeY };
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Salvar posição no localStorage
  const savePosition = useCallback((newPos: Position) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPos));
    } catch {
      // Ignorar erro
    }
  }, []);

  // --- Handlers com Pointer Events (Suporte universal para touch de iPhone, Android e mouse) ---
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Apenas botão esquerdo ou toque
    if (e.button !== 0) return;

    dragInfoRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      buttonStartX: position.x,
      buttonStartY: position.y,
      hasMoved: false
    };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignorar caso pointer capture não seja suportado
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragInfoRef.current || dragInfoRef.current.pointerId !== e.pointerId) return;

    const deltaX = e.clientX - dragInfoRef.current.startX;
    const deltaY = e.clientY - dragInfoRef.current.startY;
    const distance = Math.hypot(deltaX, deltaY);

    // Limiar de 8 pixels para diferenciar um toque de um arraste intencional
    if (distance > 8) {
      dragInfoRef.current.hasMoved = true;
      if (!isDragging) setIsDragging(true);

      const newX = dragInfoRef.current.buttonStartX + deltaX;
      const newY = dragInfoRef.current.buttonStartY + deltaY;

      const safeX = Math.max(8, Math.min(window.innerWidth - BUTTON_SIZE - 8, newX));
      const safeY = Math.max(50, Math.min(window.innerHeight - BUTTON_SIZE - 20, newY));

      setPosition({ x: safeX, y: safeY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragInfoRef.current || dragInfoRef.current.pointerId !== e.pointerId) return;

    const hadMoved = dragInfoRef.current.hasMoved;

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignorar
    }

    dragInfoRef.current = null;
    setIsDragging(false);

    if (hadMoved) {
      // Se foi arrastado, salva a nova posição
      setPosition(curr => {
        savePosition(curr);
        return curr;
      });
    } else {
      // Se foi um toque, aciona a abertura do menu
      triggerToggle();
    }
  };

  const handlePointerCancel = () => {
    dragInfoRef.current = null;
    setIsDragging(false);
  };

  // Handler de clique padrão para máxima compatibilidade com navegadores
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDragging) return;
    triggerToggle();
  };

  // Duplo clique ou duplo toque reseta para a posição padrão original
  const handleDoubleClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const def = getDefaultPosition();
    setPosition(def);
    savePosition(def);
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${BUTTON_SIZE}px`,
        height: `${BUTTON_SIZE}px`,
        zIndex: 50
      }}
      className="md:hidden select-none pointer-events-auto"
    >
      <button
        ref={buttonRef}
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        style={{
          touchAction: 'none',
          width: `${BUTTON_SIZE}px`,
          height: `${BUTTON_SIZE}px`
        }}
        aria-label={isOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
        title="Menu flutuante (Toque para abrir o menu, segure e arraste para reposicionar)"
        className={`group relative flex items-center justify-center rounded-full shadow-xl transition-transform cursor-pointer border-2 ${
          isDragging
            ? 'scale-110 ring-4 ring-blue-400/50 shadow-2xl bg-blue-700 text-white border-white cursor-grabbing'
            : isOpen
            ? 'bg-slate-800 text-white border-slate-600 hover:bg-slate-700'
            : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-white/90 dark:border-slate-800 shadow-blue-600/40 hover:from-blue-700 hover:to-indigo-700 active:scale-95'
        }`}
      >
        {/* Efeito de pulso discreto */}
        <span className="absolute -inset-1 rounded-full bg-blue-500/20 animate-pulse pointer-events-none -z-10" />

        {/* Ícone com 3 barrinhas (Menu Hamburguer) ou X quando aberto */}
        {isOpen ? (
          <X className="h-5 w-5 transition-transform group-hover:rotate-90 pointer-events-none" />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1 w-5 h-5 pointer-events-none">
            <span className="w-4 h-0.5 bg-white rounded-full transition-all group-hover:w-5" />
            <span className="w-5 h-0.5 bg-white rounded-full transition-all" />
            <span className="w-4 h-0.5 bg-white rounded-full transition-all group-hover:w-5" />
          </div>
        )}

        {/* Indicador de arraste / dica visual sutil */}
        <span
          className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-[8px] font-black text-amber-950 shadow-xs ring-1 ring-white dark:ring-slate-900 pointer-events-none"
          title="Arraste para mover"
        >
          ⠿
        </span>
      </button>
    </div>
  );
};
