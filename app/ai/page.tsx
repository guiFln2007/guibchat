export default function GuiAI() {
  const features = [
    {
      title: "Respostas da IA",
      desc: "Você compartilha seu conhecimento, a IA responde por você a qualquer hora",
      preview: (
        <div className="bg-black rounded-xl p-4 h-44 flex flex-col justify-center gap-2">
          <div className="bg-zinc-800 text-zinc-200 text-xs rounded-xl rounded-bl-sm px-3 py-2 self-start max-w-[80%]">
            Quanto custa o curso?
          </div>
          <div className="bg-violet-600 text-white text-xs rounded-xl rounded-br-sm px-3 py-2 self-end max-w-[80%]">
            R$ 97 à vista! 🎯 8 módulos + bônus + acesso vitalício. Bora?
          </div>
        </div>
      ),
    },
    {
      title: "Comentários da IA",
      desc: "Você escolhe o tom, e a IA responde a elogios do jeito que você responderia",
      preview: (
        <div className="bg-black rounded-xl p-4 h-44 flex flex-col justify-center gap-2">
          <div className="bg-zinc-900 text-zinc-200 text-xs rounded-lg px-3 py-2 rotate-[-2deg] shadow">
            Seu conteúdo me inspira demais! 🔥
          </div>
          <div className="bg-zinc-800 text-zinc-400 text-xs rounded-lg px-3 py-2 rotate-[1deg] shadow">
            Isso significa muito! Valeu por acompanhar 🤝
          </div>
        </div>
      ),
    },
    {
      title: "Metas da IA",
      desc: "A IA guia as respostas pra você alcançar seu objetivo: gerar leads, seguidores ou cliques",
      preview: (
        <div className="bg-black rounded-xl p-4 h-44 flex flex-col justify-center gap-2">
          <div className="bg-violet-600 text-white text-xs rounded-xl px-3 py-2">
            Que bom que curtiu! Quer participar da próxima turma? 😄
            <div className="bg-violet-500 rounded-lg text-center py-1.5 mt-2 font-semibold">
              Garantir vaga
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div>
      <header className="bg-zinc-900 border-b border-zinc-800 px-8 py-4 flex items-center gap-3">
        <h1 className="font-bold text-lg">Gui AI</h1>
        <span className="text-xs text-zinc-400">Versão BETA para Instagram</span>
      </header>

      <div className="p-8 bg-gradient-to-b from-zinc-950 to-zinc-900 min-h-[calc(100vh-65px)]">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-zinc-500 mt-6">Que bom te ver no MeuChat!</p>
          <h2 className="text-3xl font-extrabold tracking-tight mt-2">
            Conheça o seu novo parceiro nas redes sociais
          </h2>

          <div className="grid grid-cols-3 gap-6 mt-10 text-left">
            {features.map((f) => (
              <div key={f.title}>
                {f.preview}
                <h3 className="font-bold mt-4">{f.title}</h3>
                <p className="text-sm text-zinc-500 mt-1">{f.desc}</p>
              </div>
            ))}
          </div>

          <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg text-sm font-bold mt-10 transition shadow">
            Ativar a IA do MeuChat (em breve — via Claude API 😏)
          </button>
          <p className="text-xs text-zinc-400 mt-6">
            A inteligência artificial do MeuChat vai usar a API do Claude pra responder no seu tom. Em desenvolvimento.
          </p>
        </div>
      </div>
    </div>
  );
}
