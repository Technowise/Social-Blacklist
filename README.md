# Social-Blacklist
A reddit mod tool to automate removal of posts based on the configured blacklisted social domains/websites. The tool can look for domains in:
 * `Social Links` section of their profile
 * Post Link
 * Post Body
 
 This would be helpful to communities where spamming is common by users/bots with a goal to attract visitors to their sites/pages for commercial gain(like platforms for selling content, or get PPV etc.). After installing the app, go to App Installation Settings and configure the domains and removal message as per your requirement, and the enable/disable flags on what/where to look for these domains for removal. You can also optionally remove all posts by users having NSFW profile. To know if the app is removing the posts accordingly, you can enable mod-mail notification on removal through the settings OR check your mod-log for actions made by /u/social-blacklist.

#### What can this tool do that Automoderator can't?
While Automoderator can also do most of the these things, Automoderator rules can't:
1. Check the `Social Links` of the user.
2. Check if the user is having a NSFW profile.
Also, this tool can help those who are not tech-savvy/not comfortable with setting up Automoderator rules themselves.

### Installing the app:
Moderators can install the app to their subreddit by going to [https://developers.reddit.com/apps/social-blacklist](https://developers.reddit.com/apps/social-blacklist)

### App Settings
The settings page provides the following settings:
  1) Blacklisted-Domains: A list of domains to blacklist (For example: instagram.com, youtube.com)
  2) Removal message: Text that would be sent to the user on removal of the post.
  3) Flag to remove posts containing blacklisted domains found in `Social Links` section of user's profile.
  4) Flag to remove posts containing blacklisted domains found in post link.
  5) Flag to remove posts containing blacklisted domains found in post body/content.
  6) Flag to remove posts made by users having NSFW profiles.
  7) Flag to send mod-mail notification on removal.
  8) Flag to ignore posts by moderators of the subreddit.

## Changelog
* 0.0.2
    * Initial version with domains input in settings, and trigger on PostSubmit to read social links of user and remove on matching the blacklisted domains.
* 0.0.5
    * Update readme.
* 0.0.6
    1. Distinguish comment as 'MOD' and sticky.
    2. Add settings input for for enabling/disabling mod-mail notification on post removal.
* 0.0.7
    1. Add option to remove all posts by NSFW profiles.
    2. Add option to remove posts when blacklisted domain is found in post link.
    3. Add option to remove posts when blacklisted domain is found in post body.
    4. Add option to igore posts made by moderators of the sub.
    5. Update contents of mod-mail notification to contain author link
* 0.0.8
    * Update Readme file.