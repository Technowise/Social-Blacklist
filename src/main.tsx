import { Devvit, SettingScope} from '@devvit/public-api';
import * as protos from "@devvit/protos";
import { UserAboutResponse } from "@devvit/protos/types/devvit/plugin/redditapi/users/users_msg.js";

Devvit.configure({redditAPI: true, 
                  redis: true,
                  userActions: false });

enum removalReasons {
  none = "None",
  blacklistedDomainInSocialLinks = "Blacklisted domain found in user's Social Links",
  blacklistedDomainInStickyPost = "BLacklisted domain found in user's Sticky post",
  blacklistedDomainInPostLink = "BLacklisted domain found in post link",
  blacklistedDomainInPostBody = "BLacklisted domain found in post body/content",
  blacklistedDomainInRecentComments= "Blacklisted domain found in user's Recent comments",
  NSFWProfile= "NSFW Profile",
}

export interface RedditAPIPlugins {
    NewModmail: protos.NewModmail;
    Widgets: protos.Widgets;
    ModNote: protos.ModNote;
    LinksAndComments: protos.LinksAndComments;
    Moderation: protos.Moderation;
    GraphQL: protos.GraphQL;
    Listings: protos.Listings;
    Flair: protos.Flair;
    Wiki: protos.Wiki;
    Users: protos.Users;
    PrivateMessages: protos.PrivateMessages;
    Subreddits: protos.Subreddits;
}

export type ExtendedDevvit = typeof Devvit & {
    redditAPIPlugins: RedditAPIPlugins;
};

export function getExtendedDevvit (): ExtendedDevvit {
    return Devvit as ExtendedDevvit; // The Devvit object already has the extended properties, they are simply not reflected in the public type definition.
}

async function getRawUserData (username: string, metadata: protos.Metadata): Promise<UserAboutResponse | undefined> {
    try {
        return await getExtendedDevvit().redditAPIPlugins.Users.UserAbout({ username }, metadata);
    } catch {
        return undefined;
    }
}

Devvit.addSettings([
  {
    type: 'string',
    name: 'blacklisted-domains',
    label: 'Blacklisted Domains (comma-separated):',
    scope: SettingScope.Installation,
    helpText: "Provide a list of black-listed domains - For example: instagram.com, youtube.com",
    onValidate: ({ value }) => {
      // Split the input and trim whitespace
      if (typeof value == "string") {
        if( value.length == 0 ) {
          return "This field is required";
        }
        const domains = value.split(',').map((d) => d.trim());
        // Simple validation: check if each domain matches a basic pattern
        const domainPattern = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        for (const domain of domains) {
          if (!domainPattern.test(domain)) {
            return `Invalid domain: ${domain}`;
          }
        }
      }
    }
  },
  {
    type: 'string',
    name: 'removal-message',
    label: 'Message to user on removal of the post:',
    defaultValue: "Your post has been removed from this sub based on your profile information or post content. Please review rules of the sub for further information on what is allowed/disallowed on this subreddit.",
    scope: SettingScope.Installation,
  },
  {
    type: 'boolean',
    name: 'removeDomainInSocialLinks',
    label: 'Remove posts from users who have blacklisted domains in `Social Links` section of their profile.',
    scope: SettingScope.Installation, 
    defaultValue: true,
  }, 
  {
    type: 'boolean',
    name: 'removeDomainInPostLink',
    label: 'Remove posts containing blacklisted domains in post link',
    scope: SettingScope.Installation, 
    defaultValue: false,
  },
  {
    type: 'boolean',
    name: 'removeDomainInPostBody',
    label: 'Remove posts containing blacklisted domains in post body/content.',
    scope: SettingScope.Installation, 
    defaultValue: false,
  },
  {
    type: 'boolean',
    name: 'notifyModeratorsOnPostRemoval',
    label: 'Notify moderators on post removal through mod-mail.',
    scope: SettingScope.Installation, 
    defaultValue: false
  },
  {
    type: 'boolean',
    name: 'removeNSFWProfilePosts',
    label: 'Remove all posts made by users having NSFW profiles(irrespective of content or Social Links).',
    scope: SettingScope.Installation, 
    defaultValue: false,
  },
  {
    type: 'boolean',
    name: 'ignorePostsByModerators',
    label: 'Ignore posts by moderators of this subreddit.',
    scope: SettingScope.Installation, 
    defaultValue: true,
  },
/*  {
    type: 'number',
    name: 'max-removals',
    label: 'Number of removals after which the user would be banned',
    scope: SettingScope.Installation,
    defaultValue: 3
  }
  */
]);

Devvit.addTrigger({
  event: 'PostSubmit',
  onEvent: async (event, context) => {

    const settings = await context.settings.getAll();
    const blacklisted_list = settings['blacklisted-domains'];
    const removal_message = settings['removal-message'];
    const removeDomainInSocialLinks = settings['removeDomainInSocialLinks'];
    const removeNSFWProfilePosts = settings['removeNSFWProfilePosts'];
    const notifyModeratorsOnPostRemoval = settings['notifyModeratorsOnPostRemoval'];
    const removeDomainInPostLink = settings['removeDomainInPostLink'];
    const removeDomainInPostBody = settings['removeDomainInPostBody'];
    const ignorePostsByModerators = settings['ignorePostsByModerators'];
    const subredditName = context.subredditName??'';
    var removalReason:removalReasons = removalReasons.none;

    if( blacklisted_list && typeof blacklisted_list== "string") {

      const blacklisted_domains =blacklisted_list
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);

      // Get the post author
      var authorId = event.post?.authorId;
      if( typeof authorId == "string" && event.post!= undefined ) {
        const author = await context.reddit.getUserById(authorId);
        var authorUsername = author?.username??"nobody";

        const subreddit = await context.reddit.getCurrentSubreddit();
        const moderators = await subreddit.getModerators().all();

        if( ignorePostsByModerators ) {
          for (const mod of  moderators) {
            if (mod.username === authorUsername) {
              return;//Do not action anything if the user is a moderator.
            }
          }
        }

        const socialLinks = await author?.getSocialLinks();

        // Check if any social link matches a blacklisted domain
        const blacklistedDomainFoundInSocialLinks = socialLinks?.some(link =>
          blacklisted_domains.some(domain => link.outboundUrl.toLowerCase().includes(domain))
        );

        const blacklistedDomainFoundInPostLink = blacklisted_domains.some(domain => event.post?.url.toLowerCase().includes(domain))
        const blacklistedDomainFoundInPostBody = blacklisted_domains.some(domain => event.post?.selftext.toLowerCase().includes(domain))

        const rawUserData = await getRawUserData(authorUsername, context.debug.metadata);

        if (removeDomainInSocialLinks && blacklistedDomainFoundInSocialLinks) {
          removalReason = removalReasons.blacklistedDomainInSocialLinks;
        }
        else if( removeDomainInPostLink && blacklistedDomainFoundInPostLink ){
          removalReason = removalReasons.blacklistedDomainInPostLink;
        }
        else if( removeDomainInPostBody && blacklistedDomainFoundInPostBody ){
          removalReason = removalReasons.blacklistedDomainInPostBody;
        }
        else if ( removeNSFWProfilePosts && rawUserData?.data && rawUserData.data.subreddit?.over18) {
          removalReason = removalReasons.NSFWProfile;
        }

        if( removalReason != removalReasons.none )
        {
          const redditComment = await context.reddit.submitComment({
            id: event.post.id,
            text: `${removal_message}`
          });

          await redditComment.distinguish(true);

          await context.reddit.sendPrivateMessage({
            to: authorUsername,
            subject: `Your post '${event.post.title}' has been removed from ${subredditName}`,
            text: `${removal_message} - post link: ${event.post.permalink}`,
          });

          const post =await context.reddit.getPostById(event.post.id);
          await post.remove();

          if( notifyModeratorsOnPostRemoval ) {
            const conversationId = await context.reddit.modMail.createModNotification({  
              subject: 'post removal from Social-Blacklist',
              bodyMarkdown: 'A post has been removed by Social-Blacklist. \n\n Author: https://www.reddit.com'+author?.permalink+'  \n\n Post title: '+post.title+' \n\n Post link: '+post.permalink+'  \n\n Removal reason: '+removalReason,
              subredditId: context.subredditId,
            });
          }
        }
      }
    }
  },
});

export default Devvit;
