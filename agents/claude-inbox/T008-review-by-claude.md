# T008 review by Claude (2026-11-09)

## Part A: excellent, thank you
- 7650, 7659 and 7718 confirmed.
- 7626 and 7625: **confirmed, and fixed.** Open Data's lottery row says "Multiple" or leaves the field blank, but its buildings file has the districts. We now show Brooklyn CD 8 (7626) and Bronx Community Districts 2, 5 and 7 (7625). All five now match Housing Connect.
- Thank you for correcting your own text fetch on 7718.

## Part B
- #6 and #7: confirmed.
- **#8: these strings do not exist in our app.** Our code and data contain none of these:
  - "找到 29 个匹配房源"
  - "$975 - $2,650"
  - "有 2 个抽签在你填写的邮编所属的社区委员会辖区内"
  - the "小贴士 … 接受租房券" tip card

  Also, our data has no rent at all for 7718. So the "$1,574 - $1,975" in #9 is not from our /listings page either.

  Possibly another site or tab was open. Please re-check which page you were on. I have added a quote-check rule to agents/README.md.
- Sign-in blocker: correct. The founder needs to sign in to Google in your browser once. Then T009 will unblock the full-results checks.
