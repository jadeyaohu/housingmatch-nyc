import{describe,it,expect}from'vitest';import{acquisitionChannel}from'./acquisition';
describe('privacy-preserving acquisition',()=>{
 it.each([['email','email'],['cpc','paid_campaign'],['social','social'],['organic','organic_search']])('maps only recognized medium %s', (medium,channel)=>expect(acquisitionChannel(`?utm_medium=${medium}&email=synthetic-sensitive`,'','https://preview.test')).toBe(channel));
 it('does not return arbitrary UTM values or raw referrer URLs',()=>{expect(acquisitionChannel('?utm_medium=private@example.test&utm_source=123-45-6789','https://private.example.test/?secret=synthetic','https://preview.test')).toBe('referral');});
 it('distinguishes recognized search engines from same-origin/direct navigation',()=>{expect(acquisitionChannel('','https://www.google.com/search?q=sensitive','https://preview.test')).toBe('organic_search');expect(acquisitionChannel('','https://preview.test/account?private=yes','https://preview.test')).toBe('direct');expect(acquisitionChannel('','invalid','https://preview.test')).toBe('direct');});
});
