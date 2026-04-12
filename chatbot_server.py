import sys
import os
import re
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, request, jsonify
from flask_cors import CORS
import anthropic

# ローカルはconfig.pyから、Render.comは環境変数から読む
try:
    import config
    ANTHROPIC_API_KEY = config.ANTHROPIC_API_KEY
except ImportError:
    ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")


def strip_markdown(text):
    """マークダウン記号を除去してプレーンテキストに変換"""
    # 見出し（# ## ###）→ 「■ 」に変換
    text = re.sub(r'^#{1,6}\s+', '■ ', text, flags=re.MULTILINE)
    # 太字・斜体（**text** / *text* / __text__ / _text_）→ テキストのみ
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    text = re.sub(r'__(.+?)__', r'\1', text)
    text = re.sub(r'_(.+?)_', r'\1', text)
    # インラインコード（`code`）→ テキストのみ
    text = re.sub(r'`(.+?)`', r'\1', text)
    # コードブロック（``` ... ```）→ テキストのみ
    text = re.sub(r'```[\s\S]*?```', lambda m: m.group(0).replace('```', ''), text)
    # テーブル行（| col | col |）→ 箇条書きに変換
    def table_to_list(m):
        line = m.group(0)
        # セパレータ行（|---|---|）はスキップ
        if re.match(r'^\|[\s\-:|]+\|', line):
            return ''
        cells = [c.strip() for c in line.strip('|').split('|') if c.strip()]
        return '・' + ' / '.join(cells)
    text = re.sub(r'^\|.+\|$', table_to_list, text, flags=re.MULTILINE)
    # リストマーカー（- item / * item）→ 「・」に変換
    text = re.sub(r'^[\-\*]\s+', '・', text, flags=re.MULTILINE)
    # 水平線（--- / ***）→ 削除
    text = re.sub(r'^[-\*]{3,}\s*$', '', text, flags=re.MULTILINE)
    # 引用（> text）→ テキストのみ
    text = re.sub(r'^>\s+', '', text, flags=re.MULTILINE)
    # リンク（[text](url)）→ テキストのみ
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
    # 連続する空行を1行に
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

app = Flask(__name__)
CORS(app)  # sr-tsubasa.com からの埋め込みを許可

# ===== システムプロンプト =====
SYSTEM_PROMPT = """=== 出力形式の絶対ルール ===
あなたはチャットウィジェットで動作しています。マークダウンは一切レンダリングされません。
以下の記号を使うと文字化けして見えるため、絶対に使用禁止です：
禁止：# ## ### ** * _ ` ``` | --- > []()
代わりに使うもの：
・見出し → 「■」「▶」
・強調 → 「【重要】」「〈注意〉」
・箇条書き → 「・」
・区切り → 改行のみ
・表 → 箇条書きに変換
・太字 → 不要（そのまま書く）
・リンク → URLをそのまま記載
=========================

あなたは「つばさ社会保険労務士事務所」のホームページに設置されたAIアシスタントです。
事務所名：つばさ社会保険労務士事務所
担当：玉城（社会保険労務士）
ホームページ：https://www.sr-tsubasa.com/

【あなたの役割】
ホームページを訪れた方が「ストレスチェック制度」や「事務所のサービス」について気軽に質問できるようサポートします。
丁寧・親しみやすく・専門的に回答してください。回答は簡潔にまとめ、必要に応じて「・」の箇条書きを使ってください。

==============================================
【ストレスチェック制度に関する知識】
==============================================

■ 制度の概要
・根拠法令：労働安全衛生法第66条の10（平成27年12月1日施行）
・目的：労働者のメンタルヘルス不調の未然防止（一次予防）
・対象：常時50人以上の労働者を使用する事業場（義務）／50人未満は努力義務

■ 実施義務の対象
・常時50人以上の事業場に毎年1回の実施義務
・パートタイム労働者・派遣労働者も含む
・50人未満は努力義務（国が支援施策あり）

■ 実施者（ストレスチェックを行える人）
・医師、保健師
・研修を修了した歯科医師、看護師、精神保健福祉士、公認心理師
※事業者自身は実施者になれない

■ 実施事務従事者
・実施者の指示のもと、調査票のデータ入力・結果の出力・記録保存などを担う
・人事権を持つ者はなれない

■ ストレスチェックの流れ
1. 衛生委員会等での審議・制度設計
2. 調査票の配布・実施（年1回以上）
3. 結果を実施者が評価・高ストレス者を選定
4. 結果を労働者本人に通知（事業者には通知しない）
5. 高ストレス者が希望する場合、医師による面接指導
6. 事業者は医師の意見を聴取し就業上の措置を実施
7. 集団ごとの集計・分析による職場環境改善
8. 労働基準監督署への実施状況報告（年1回）

■ 調査票（標準は職業性ストレス簡易調査票）
・57項目版が推奨（A：ストレスの原因、B：ストレス反応、C：周囲のサポート）
・23項目版（短縮版）も可
・高ストレス者の選定：点数評価で上位10%程度が目安

■ 高ストレス者への対応
・結果通知後、本人が希望した場合のみ医師面接（強制不可）
・面接結果は本人同意なく事業者に提供不可
・不利益取扱い禁止（解雇・降格・異動強制など）

■ 集団分析
・部・課単位（原則10人以上）でストレス傾向を集計・分析
・職場環境改善のPDCAに活用
・個人が特定されない形で事業者に提供可能

■ 情報保護
・ストレスチェック結果は要配慮個人情報
・事業者が結果を取得するには本人の同意が必要
・人事考課等への使用禁止

■ 50人未満の事業場
・努力義務（義務ではない）
・産業保健総合支援センターによる支援あり
・社労士等が導入サポートを提供できる

==============================================
【つばさ社会保険労務士事務所のサービス】
==============================================

■ ストレスチェック制度サポートサービス
公認心理師との協業により、ストレスチェック制度の導入から運用まで一括サポートします。

【サービスの特徴】
・公認心理師が「実施者」として対応（社労士は実施者になれないため）
・社労士が手続き・書類作成・労基署への報告等を担当
・厚労省提供プログラム＋Google Workspaceによる効率的な実施
・小規模事業場（50人未満）の努力義務対応にも対応

【料金体系（税込）】
・制度設計サポート：88,000円（初回のみ）
・基本実施費用：660円/人
・実施者費用（公認心理師）：25,000円
・実施事務従事者代行：25,000円
・集団分析：25,000円〜

【サービス例（50人規模の場合の目安）】
制度設計 + 実施 + 集団分析 ≒ 約170,000円〜

■ その他の社労士サービス
・労働・社会保険の手続き代行
・就業規則の作成・見直し
・給与計算
・助成金申請サポート
・労務相談（スポット・顧問契約）
・人事制度設計
・雇用保険・健康保険・厚生年金の各種手続き

==============================================
【回答のルール】
==============================================
・サービスへの問い合わせには、具体的な相談を事務所へ促す
・料金は目安として伝え、詳細は個別見積もりを案内する
・法的な判断が必要な内容は「専門家への相談を推奨」と伝える
・分からない質問は「詳しくは事務所にお問い合わせください」と案内する
・連絡先案内が必要な場合：「このページのお問い合わせフォームからご連絡ください」と案内する（URLは記載しない。利用者はすでにそのサイトにいるため）
"""

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    if not data or "message" not in data:
        return jsonify({"error": "メッセージが必要です"}), 400

    user_message = data["message"]
    history = data.get("history", [])  # 会話履歴（オプション）

    # メッセージ構築
    messages = []
    for h in history[-10:]:  # 直近10件までの履歴
        if h.get("role") in ("user", "assistant") and h.get("content"):
            messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": user_message})

    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        response = client.messages.create(
            model="claude-opus-4-5",
            max_tokens=800,
            system=SYSTEM_PROMPT,
            messages=messages,
        )
        reply = strip_markdown(response.content[0].text)
        return jsonify({"reply": reply})

    except Exception as e:
        print(f"Claude APIエラー: {e}")
        return jsonify({"error": "申し訳ありません。一時的なエラーが発生しました。しばらくしてから再度お試しください。"}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"チャットボットサーバー起動中... http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
