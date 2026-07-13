import React from 'react';
import { HelpCircle, MessageSquare, Mail, ArrowUpRight } from 'lucide-react';

export const SuportePage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-xl mx-auto py-8 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 mb-2">
          <HelpCircle className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">Central de Suporte</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Se precisar de ajuda é só escolher os canais abaixo:
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
        {/* WhatsApp Channel */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="text-center sm:text-left">
              <h4 className="text-sm font-bold text-slate-800 dark:text-white">WhatsApp</h4>
              <p className="text-xs text-slate-400">Atendimento rápido por mensagem</p>
            </div>
          </div>
          <a
            href="https://wa.me/5522981222280"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/10 hover:bg-emerald-500 transition-all cursor-pointer"
          >
            Falar no WhatsApp
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Email Channel */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Mail className="h-5 w-5" />
            </div>
            <div className="text-center sm:text-left">
              <h4 className="text-sm font-bold text-slate-800 dark:text-white">E-mail</h4>
              <p className="text-xs text-slate-400">magdiel.morais@gmail.com</p>
            </div>
          </div>
          <a
            href="mailto:magdiel.morais@gmail.com"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200/80 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-850 transition-all"
          >
            Enviar E-mail
          </a>
        </div>
      </div>
    </div>
  );
};
