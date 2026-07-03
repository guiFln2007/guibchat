export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-200 px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Política de Privacidade — AutoDM Pogere</h1>
        <p className="text-sm text-zinc-400">Última atualização: junho de 2026</p>

        <section className="space-y-3 text-sm leading-relaxed">
          <p>
            O AutoDM Pogere é uma ferramenta de uso interno para automação de mensagens e
            comentários da conta de Instagram <strong>@adspogere</strong>, operada pelo
            próprio titular da conta.
          </p>

          <h2 className="font-semibold text-base pt-2">Dados coletados</h2>
          <p>
            A ferramenta processa, via API oficial da Meta: comentários públicos feitos em
            publicações da conta conectada e mensagens diretas enviadas à conta conectada
            (ID do remetente, nome de usuário e texto). Esses dados são usados exclusivamente
            para responder automaticamente às interações.
          </p>

          <h2 className="font-semibold text-base pt-2">Uso dos dados</h2>
          <p>
            Os dados são utilizados apenas para: responder comentários, enviar mensagens
            diretas solicitadas pelo usuário (ex.: envio de link após comentário com
            palavra-chave) e manter registro interno das interações. Nenhum dado é vendido,
            compartilhado com terceiros ou usado para finalidades distintas.
          </p>

          <h2 className="font-semibold text-base pt-2">Armazenamento e retenção</h2>
          <p>
            Registros de interação são armazenados de forma segura e retidos pelo período
            necessário à operação da automação, podendo ser excluídos a qualquer momento.
          </p>

          <h2 className="font-semibold text-base pt-2">Exclusão de dados</h2>
          <p>
            Para solicitar a exclusão dos seus dados, envie uma mensagem direta para
            @adspogere no Instagram ou e-mail para o contato da conta. Os dados serão
            removidos em até 7 dias.
          </p>

          <h2 className="font-semibold text-base pt-2">Contato</h2>
          <p>Instagram: @adspogere</p>
        </section>
      </div>
    </main>
  );
}
