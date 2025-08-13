import { textHighlightService } from './textHighlightService';
import type { IssueHighlight, HighlightOptions } from './textHighlightService';

describe('TextHighlightService', () => {
  describe('generateHTML (existing functionality)', () => {
    it('should highlight known words in blue', () => {
      const text = 'hello world test';
      const knownWords = new Set(['hello', 'world']);
      
      const result = textHighlightService.generateHTML(text, knownWords);
      
      expect(result).toBe('<span class="known-word">hello</span> <span class="known-word">world</span> test');
    });

    it('should handle empty known words set', () => {
      const text = 'hello world';
      const knownWords = new Set<string>();
      
      const result = textHighlightService.generateHTML(text, knownWords);
      
      expect(result).toBe('hello world');
    });

    it('should handle empty text', () => {
      const text = '';
      const knownWords = new Set(['hello']);
      
      const result = textHighlightService.generateHTML(text, knownWords);
      
      expect(result).toBe('');
    });
  });

  describe('generateHTMLWithOptions (new functionality)', () => {
    it('should highlight issues with red background', () => {
      const text = 'hello world test';
      const issues: IssueHighlight[] = [
        { text: 'hello', id: 'issue-1', type: 'needs-help' },
        { text: 'test', id: 'issue-2', type: 'indexing' }
      ];
      const options: HighlightOptions = { issues };
      
      const result = textHighlightService.generateHTMLWithOptions(text, options);
      
      expect(result).toBe('<span class="issue-needs-help">hello</span> world <span class="issue-indexing">test</span>');
    });

    it('should highlight both known words and issues', () => {
      const text = 'hello world test';
      const knownWords = new Set(['world']);
      const issues: IssueHighlight[] = [{ text: 'hello', id: 'issue-1', type: 'needs-help' }];
      const options: HighlightOptions = { knownWords, issues };
      
      const result = textHighlightService.generateHTMLWithOptions(text, options);
      
      expect(result).toBe('<span class="issue-needs-help">hello</span> <span class="known-word">world</span> test');
    });

    it('should prioritize issues over known words for overlapping text', () => {
      const text = 'hello world';
      const knownWords = new Set(['hello']);
      const issues: IssueHighlight[] = [{ text: 'hello', id: 'issue-1', type: 'new-word' }];
      const options: HighlightOptions = { knownWords, issues };
      
      const result = textHighlightService.generateHTMLWithOptions(text, options);
      
      expect(result).toBe('<span class="issue-new-word">hello</span> world');
    });

    it('should handle case sensitive matching for issues and case insensitive for known words', () => {
      const text = 'Hello WORLD';
      const knownWords = new Set(['hello']); // Known words are still case insensitive
      const issues: IssueHighlight[] = [
        { text: 'world', id: 'i1', type: 'indexing' }, // Won't match "WORLD"
        { text: 'WORLD', id: 'i2', type: 'indexing' }  // Will match "WORLD"
      ];
      const options: HighlightOptions = { knownWords, issues };
      
      const result = textHighlightService.generateHTMLWithOptions(text, options);
      
      expect(result).toBe('<span class="known-word">Hello</span> <span class="issue-indexing">WORLD</span>');
    });

    it('should handle empty options', () => {
      const text = 'hello world';
      const options: HighlightOptions = {};
      
      const result = textHighlightService.generateHTMLWithOptions(text, options);
      
      expect(result).toBe('hello world');
    });

    it('should preserve text structure with punctuation', () => {
      const text = 'Hello, world! This is a test.';
      const knownWords = new Set(['hello']);
      const issues: IssueHighlight[] = [{ text: 'test', id: 'issue-1', type: 'needs-help' }];
      const options: HighlightOptions = { knownWords, issues };
      
      const result = textHighlightService.generateHTMLWithOptions(text, options);
      
      expect(result).toBe('<span class="known-word">Hello</span>, world! This is a <span class="issue-needs-help">test</span>.');
    });

    it('should include comment icons for issues with comments', () => {
      const text = 'hello commented word test';
      const issues: IssueHighlight[] = [
        { text: 'commented', id: 'issue-1', type: 'new-word', commentCount: 2 },
        { text: 'test', id: 'issue-2', type: 'needs-help', commentCount: 0 }
      ];
      const options: HighlightOptions = { issues };
      
      const result = textHighlightService.generateHTMLWithOptions(text, options);
      
      expect(result).toBe('hello <span class="issue-new-word">commented<span class="issue-comment-icon"><svg class="w-3 h-3 inline ml-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg><span class="text-xs ml-0.5">2</span></span></span> word <span class="issue-needs-help">test</span>');
    });

    it('should not include comment icons when commentCount is 0', () => {
      const text = 'hello uncommented word';
      const issues: IssueHighlight[] = [
        { text: 'uncommented', id: 'issue-1', type: 'indexing', commentCount: 0 }
      ];
      const options: HighlightOptions = { issues };
      
      const result = textHighlightService.generateHTMLWithOptions(text, options);
      
      expect(result).toBe('hello <span class="issue-indexing">uncommented</span> word');
    });

    it('should highlight full issue text including parentheses and affixes', () => {
      const text = 'nitawāpēnākēw awa (ē-)tipinikāsowiht âhpinohk ohtāwiya - ohtāwīpana ēkwa.';
      const issues: IssueHighlight[] = [
        { text: '(ē-)tipinikāsowiht', id: 'i1', type: 'new-word', commentCount: 0 },
      ];
      const options: HighlightOptions = { issues };

      const result = textHighlightService.generateHTMLWithOptions(text, options);

      expect(result).toContain('<span class="issue-new-word">(ē-)tipinikāsowiht</span>');
    });

    it('should be case sensitive for issue matching', () => {
      const text = 'Hello world Test';
      const issues: IssueHighlight[] = [
        { text: 'hello', id: 'i1', type: 'needs-help' }, // lowercase - should NOT match
        { text: 'Hello', id: 'i2', type: 'indexing' },   // exact case - should match
        { text: 'test', id: 'i3', type: 'new-word' },    // lowercase - should NOT match
        { text: 'Test', id: 'i4', type: 'new-word' }     // exact case - should match
      ];
      const options: HighlightOptions = { issues };

      const result = textHighlightService.generateHTMLWithOptions(text, options);

      expect(result).toBe('<span class="issue-indexing">Hello</span> world <span class="issue-new-word">Test</span>');
    });

    it('should match exact punctuation in issue text', () => {
      const text = 'paskwāw-okimāw, test word.';
      const issues: IssueHighlight[] = [
        { text: 'paskwāw-okimāw,', id: 'i1', type: 'needs-help' }, // with comma - should match
        { text: 'paskwāw-okimāw', id: 'i2', type: 'indexing' },   // without comma - should NOT match
        { text: 'word.', id: 'i3', type: 'new-word' },           // with period - should match
        { text: 'word', id: 'i4', type: 'new-word' }             // without period - should NOT match
      ];
      const options: HighlightOptions = { issues };

      const result = textHighlightService.generateHTMLWithOptions(text, options);

      expect(result).toBe('<span class="issue-needs-help">paskwāw-okimāw,</span> test <span class="issue-new-word">word.</span>');
    });
  });
});