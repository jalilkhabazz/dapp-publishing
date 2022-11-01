import { mintNft } from "./utils";
import type { Context } from "./types";
import {
  bundlrStorage,
  keypairIdentity,
  Metaplex,
  TransactionBuilder,
} from "@metaplex-foundation/js";
import debugModule from "debug";
import type { JsonMetadata } from "@metaplex-foundation/js";
import type { PublicKey, Signer } from "@solana/web3.js";
import { validatePublisher } from "./validate/publisher";

const debug = debugModule("PUBLISHER");

export type Publisher = {
  address: string;
  name: string;
  description: {
    "en-US": string;
  };
  website: string;
  email: string;
};

export type PublisherJsonMetadata = JsonMetadata & {
  name: string;
  extensions: {
    solana_dapp_store: {
      publisher_details: {
        name: string;
        website: string;
        contact: string;
      };
    };
  };
};

export const createPublisherJson = (
  publisher: Publisher
): PublisherJsonMetadata => {
  const publisherMetadata = {
    name: publisher.name,
    // TODO(jon): Handle locale resources
    description: publisher.description["en-US"],
    // TODO(jon): Figure out where to get this image
    image: "",
    external_url: publisher.website,
    properties: {
      category: "dApp",
      creators: [
        {
          address: publisher.address,
          share: 100,
        },
      ],
    },
    extensions: {
      // TODO(jon): What is the name of this actually?
      solana_dapp_store: {
        publisher_details: {
          name: publisher.name,
          website: publisher.website,
          contact: publisher.email,
        },
      },
    },
  };

  return publisherMetadata;
};

type CreatePublisherInput = {
  mintAddress: Signer;
  publisherDetails: Publisher;
};

export const createPublisher = async (
  { mintAddress, publisherDetails }: CreatePublisherInput,
  { connection, publisher }: Context
): Promise<TransactionBuilder> => {
  debug(`Minting publisher NFT`);

  // This is a little leaky
  const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(publisher))
    .use(
      connection.rpcEndpoint.includes("devnet")
        ? bundlrStorage({
            address: "https://devnet.bundlr.network",
          })
        : bundlrStorage()
    );

  const publisherJson = createPublisherJson(publisherDetails);
  validatePublisher(publisherJson);

  const txBuilder = await mintNft(metaplex, publisherJson, {
    isCollection: true,
    isMutable: true,
    useNewMint: mintAddress,
  });

  return txBuilder;
};
