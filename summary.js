const fs = require('fs');
const path = require('path');

// キャラクター設定とカラー
const characters = {
    mercury: { name: 'マーキュリー', color: '\x1b[96m', emoji: '💧' }, // 水色
    blonde: { name: 'ブロンド', color: '\x1b[93m', emoji: '⭐' },     // 黄色
    darkhair: { name: 'ダークヘア', color: '\x1b[35m', emoji: '🌸' }, // マゼンタ
    glasses: { name: 'メガネ', color: '\x1b[32m', emoji: '📚' },      // 緑
    sister: { name: 'シスター', color: '\x1b[91m', emoji: '🎀' },     // 赤
    master: { name: 'マスター', color: '\x1b[33m', emoji: '🎩' },     // オレンジ
    butler: { name: 'バトラー', color: '\x1b[34m', emoji: '🎭' }      // 青
};

const resetColor = '\x1b[0m';

function analyzeStories() {
    const storiesDir = path.join(__dirname, 'stories');
    
    if (!fs.existsSync(storiesDir)) {
        console.log('storiesディレクトリが見つかりません');
        return;
    }

    const files = fs.readdirSync(storiesDir).filter(file => file.endsWith('.md'));
    
    if (files.length === 0) {
        console.log('Markdownファイルが見つかりません');
        return;
    }

    console.log('\n🎭 SORAMIMI Stories キャラクター統計\n');
    console.log('='.repeat(50));

    // 全体統計
    const totalStats = {};
    const fileStats = {};

    files.forEach(file => {
        const filePath = path.join(storiesDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // キャラクターの登場回数をカウント
        const characterCounts = {};
        
        Object.keys(characters).forEach(char => {
            const regex = new RegExp(`${char}:(left|right):(\\w+)`, 'g');
            const matches = content.match(regex) || [];
            characterCounts[char] = matches.length;
            
            // 全体統計に追加
            if (!totalStats[char]) totalStats[char] = 0;
            totalStats[char] += matches.length;
        });

        fileStats[file] = characterCounts;
    });

    // 全エピソード数
    const totalEpisodes = files.length;
    
    // キャラクター別統計表示
    console.log('\n📊 キャラクター別統計:\n');

    Object.keys(characters).forEach(char => {
        const charInfo = characters[char];
        const totalLines = totalStats[char] || 0;
        const episodeCount = files.filter(file => fileStats[file][char] > 0).length;
        const percentage = totalEpisodes > 0 ? Math.round((episodeCount / totalEpisodes) * 100) : 0;
        
        console.log(
            `${charInfo.color}${charInfo.emoji} ${charInfo.name}${resetColor}: ` +
            `${totalLines}セリフ ${episodeCount}/${totalEpisodes}話 ${percentage}%`
        );
    });

    // エピソード別詳細
    console.log('\n📋 エピソード別詳細:\n');

    files.sort().forEach(file => {
        const stats = fileStats[file];
        const activeChars = Object.keys(stats).filter(char => stats[char] > 0);
        
        if (activeChars.length > 0) {
            console.log(`📖 ${file}:`);
            activeChars.forEach(char => {
                const charInfo = characters[char];
                console.log(`   ${charInfo.color}${charInfo.emoji} ${charInfo.name}${resetColor}: ${stats[char]}セリフ`);
            });
            console.log();
        }
    });

    // 組み合わせ統計
    console.log('\n🤝 キャラクター組み合わせ統計:\n');

    const combinations = {};
    files.forEach(file => {
        const stats = fileStats[file];
        const activeChars = Object.keys(stats).filter(char => stats[char] > 0).sort();
        
        if (activeChars.length > 1) {
            const combo = activeChars.join(' + ');
            if (!combinations[combo]) combinations[combo] = [];
            combinations[combo].push(file);
        }
    });

    Object.keys(combinations).sort().forEach(combo => {
        const files = combinations[combo];
        console.log(`${combo}: ${files.length}話 (${files.join(', ')})`);
    });

    console.log('\n' + '='.repeat(50));
    console.log(`📈 総計: ${totalEpisodes}エピソード解析完了`);
}

// メイン実行
if (require.main === module) {
    analyzeStories();
}

module.exports = { analyzeStories };