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

    it('should handle case insensitive matching', () => {
      const text = 'Hello WORLD';
      const knownWords = new Set(['hello']);
      const issues: IssueHighlight[] = [{ text: 'world', id: 'issue-1', type: 'indexing' }];
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
  });
});