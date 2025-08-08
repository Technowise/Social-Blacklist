# Social-Blacklist
A reddit mod tool to automate removal of posts based on the configured blacklisted social domains/websites or from NSFW profiles. The tool can look for given set of domains in:
 * `Social Links` section of their profile
 * Post Link
 * Post Body
 * Post Comment
 * Profile Sticky Post
 
 This is helpful to communities where spamming is common by users/bots with a goal to attract visitors to their sites/pages for commercial gain(like platforms for selling content, or get PPV etc.). After installing the app, go to App Installation Settings and configure the domains and removal message as per your requirement, and enable/disable settings as per your subreddit requirements. You can also configure this to ban the users after a given number of removals, and to remove posts by users having NSFW profile. To know if the app is removing the posts accordingly, you can enable mod-mail notification on removal through the settings OR review your mod-log for actions made by /u/social-blacklist.

![Screenshot of settings available](https://i.redd.it/l2t7vak8sddf1.png)

#### What can this tool do that Automoderator can't?
While Automoderator can also do most of the these things, Automoderator rules can't:
1. Check the `Social Links` of the user.
2. Check if the user is having a NSFW profile.
3. Check profile sticky post of the user.
4. Keep count of rule violations/removals before banning the users.

Also, this tool can come handy for those who are not comfortable/tech-savvy with setting up Automoderator rules themselves.

### Installing the app:
Moderators can install the app to their subreddit by going to [https://developers.reddit.com/apps/social-blacklist](https://developers.reddit.com/apps/social-blacklist)

### App Settings
The settings page provides the following settings:
  1) Blacklisted-Domains: A list of domains to blacklist (For example: instagram.com, youtube.com)
  2) Removal message: Text that would be sent to the user on removal of the post.
  3) Flag to remove posts containing blacklisted domains found in `Social Links` section of user's profile.
  4) Flag to remove posts containing blacklisted domains found in post link.
  5) Flag to remove posts containing blacklisted domains found in post body/content.
  6) Flag to remvoe posts by users having blacklisted domain in profile sticky post.
  7) Flag to remove comments containing blacklisted domains.
  8) Flag to remove posts made by users having NSFW profiles.
  9) Flag to send mod-mail notification on removal.
  10) Flag to ignore posts by moderators of the subreddit.
  11) Flag to ignore posts by approved users of the subreddit.
  12) Drop-down for optionally ban users after given number of removals. 

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
* 0.0.9
    * Add option to remove comments containing blacklisted domain.
* 0.0.11
    * Add scheduled job to check new posts every 10 mins (to catch users who may update profile after making posts)
* 0.0.12
    * Update scheduled job to check to ignore posts that are approved or already removed.
* 0.0.13
    * Add option to remove posts containing blacklisted domain in profile sticky posts.
* 0.0.14
    * Add check on post object to be valid before calling the remove method(to fix an issue in removing posts that happens intermittently).
* 0.0.15
    * Improvement: Add try-catch block to re-try removing post if it fails at removing on the first go.
* 0.0.16
    * Add option to ignore posts/comments made by approved users of the subreddit.
* 0.0.17
    * Add option to ban user after given number of removals.